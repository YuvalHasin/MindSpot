using System.Diagnostics;
using System.Text.Json;
using MindSpot_server.Models.Verification;

namespace MindSpot_server.Services.Verification
{
    /// <summary>
    /// Invokes the Python Selenium script (verify_license.py) as a child process,
    /// captures its JSON stdout, and returns a typed <see cref="LicenseVerificationResult"/>.
    /// </summary>
    public class LicenseVerificationService : ILicenseVerificationService
    {
        private readonly ILogger<LicenseVerificationService> _logger;
        private readonly string _scriptPath;
        private readonly string _pythonExecutable;

        // Give the browser automation a generous but finite timeout
        private static readonly TimeSpan ScriptTimeout = TimeSpan.FromSeconds(90);

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public LicenseVerificationService(
            ILogger<LicenseVerificationService> logger,
            IConfiguration configuration)
        {
            _logger = logger;

            // Prefer relative path from appsettings, otherwise resolve from base dir
            var configuredPath = configuration["Verification:PythonScriptPath"];
            _scriptPath = string.IsNullOrWhiteSpace(configuredPath)
                ? Path.Combine(AppContext.BaseDirectory, "Scripts", "verify_license.py")
                : Path.IsPathRooted(configuredPath)
                    ? configuredPath
                    : Path.Combine(AppContext.BaseDirectory, configuredPath);

            // On Windows "python" is the standard command; on Linux/macOS it's "python3"
            var configuredExe = configuration["Verification:PythonExecutable"];
            _pythonExecutable = string.IsNullOrWhiteSpace(configuredExe)
                ? (OperatingSystem.IsWindows() ? "python" : "python3")
                : configuredExe;

            _logger.LogInformation(
                "LicenseVerificationService configured: exe={Exe}, script={Script}",
                _pythonExecutable, _scriptPath);
        }

        public async Task<LicenseVerificationResult> VerifyLicenseAsync(
            string licenseNumber,
            string fullName,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "Invoking license verification script for license: {License}, name: {Name}",
                licenseNumber, fullName);

            var safeLicense = SanitiseArg(licenseNumber);
            var safeName    = SanitiseArg(fullName);

            // On Windows the configured executable may not be on the PATH of the server
            // process. We try a ranked list so that at least one succeeds.
            var candidates = BuildExecutableCandidates(_pythonExecutable);

            foreach (var exe in candidates)
            {
                var result = await TryRunScriptAsync(exe, safeLicense, safeName, cancellationToken);
                if (result is not null)
                    return result;
            }

            return Failed(
                "Python interpreter not found. " +
                "Please install Python and ensure 'py', 'python', or 'python3' is on the system PATH.");
        }

        // ── Try a single Python executable; return null if the executable was not found ──
        private async Task<LicenseVerificationResult?> TryRunScriptAsync(
            string exe, string safeLicense, string safeName,
            CancellationToken cancellationToken)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName               = exe,
                    RedirectStandardOutput = true,
                    RedirectStandardError  = true,
                    UseShellExecute        = false,
                    CreateNoWindow         = true
                };
                psi.ArgumentList.Add(_scriptPath);
                psi.ArgumentList.Add("--license");
                psi.ArgumentList.Add(safeLicense);
                psi.ArgumentList.Add("--name");
                psi.ArgumentList.Add(safeName);

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(ScriptTimeout);

                using var process = new Process { StartInfo = psi };
                process.Start();

                var stdoutTask = process.StandardOutput.ReadToEndAsync(cts.Token);
                var stderrTask = process.StandardError.ReadToEndAsync(cts.Token);

                await process.WaitForExitAsync(cts.Token);
                var stdout = await stdoutTask;
                var stderr = await stderrTask;

                // Exit code 9009 (Windows) or 127 (Unix) = interpreter not found → try next
                if (process.ExitCode is 9009 or 127)
                {
                    _logger.LogDebug("Executable '{Exe}' not found (exit {Code}), trying next.", exe, process.ExitCode);
                    return null;
                }

                if (!string.IsNullOrWhiteSpace(stderr))
                    _logger.LogDebug("[{Exe}] stderr: {Stderr}", exe, stderr);

                if (process.ExitCode != 0)
                {
                    _logger.LogError(
                        "License verification script exited with code {Code} (exe={Exe}). Stderr: {Stderr}",
                        process.ExitCode, exe, stderr);
                    return Failed($"Verification script failed (exit code {process.ExitCode}).");
                }

                return ParseOutput(stdout, safeLicense);
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("License verification script timed out for license {License}", safeLicense);
                return Failed("License verification timed out.");
            }
            catch (System.ComponentModel.Win32Exception)
            {
                // Executable not found on this platform → try next candidate
                _logger.LogDebug("Executable '{Exe}' not found on this system, trying next.", exe);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error running license verification script with '{Exe}'", exe);
                return Failed($"Service error: {ex.Message}");
            }
        }

        // ── Build an ordered list of Python executables to try ─────────────────
        private static IReadOnlyList<string> BuildExecutableCandidates(string configured)
        {
            // Always try the configured one first, then common fallbacks
            var all = new[] { configured, "py", "python", "python3" };
            return all.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        // -----------------------------------------------------------------------
        // Private helpers
        // -----------------------------------------------------------------------

        private LicenseVerificationResult ParseOutput(string stdout, string licenseNumber)
        {
            if (string.IsNullOrWhiteSpace(stdout))
                return Failed("Verification script produced no output.");

            try
            {
                var result = JsonSerializer.Deserialize<LicenseVerificationResult>(stdout, _jsonOptions);
                return result ?? Failed("Deserialisation returned null.");
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to parse script output: {Output}", stdout);
                return Failed($"Could not parse script output: {ex.Message}");
            }
        }

        /// <summary>Remove characters that could escape argument boundaries.</summary>
        private static string SanitiseArg(string value) =>
            value.Replace("\"", "").Replace("'", "").Replace(";", "").Trim();

        private static LicenseVerificationResult Failed(string reason) => new()
        {
            IsValid       = false,
            IsActive      = false,
            FailureReason = reason
        };
    }
}
