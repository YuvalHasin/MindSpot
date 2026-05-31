import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock, User, ArrowLeft, Loader2, Award, Briefcase,
  Phone, Upload, CheckCircle2, Clock, ChevronRight,
} from "lucide-react";

// ── Registration steps ────────────────────────────────────────────────────────
const STEP = { DETAILS: 1, PROFESSIONAL: 2, PENDING: 3 };

const TherapistAuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [regStep, setRegStep] = useState(STEP.DETAILS);
  const navigate = useNavigate();

  // Login fields
  const [loginLicense,  setLoginLicense]  = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Step 1 fields
  const [fullName,      setFullName]      = useState("");
  const [phoneNumber,   setPhoneNumber]   = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [password,      setPassword]      = useState("");

  // Step 2 fields
  const [specialties, setSpecialties] = useState("");
  const [bio,         setBio]         = useState("");
  const [selfieFile,  setSelfieFile]  = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const selfieRef  = useRef();
  const licenseRef = useRef();

  // Shared UI state
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [errors,  setErrors]  = useState({});
  const [registeredId, setRegisteredId] = useState(null);

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (!phoneNumber.trim()) {
      e.phoneNumber = "Phone number is required.";
    } else if (!/^\d{3}-?\d{7}$/.test(phoneNumber.replace(/\s/g, ""))) {
      e.phoneNumber = "Enter a valid Israeli phone number.";
    }
    if (!licenseNumber.trim()) {
      e.licenseNumber = "License number is required.";
    } else if (!/^27-\d{4,6}$/.test(licenseNumber)) {
      e.licenseNumber = "Format: 27-XXXXX";
    }
    if (!password.trim()) e.password = "Password is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!specialties.trim()) e.specialties = "Specialties are required.";
    if (!bio.trim())         e.bio         = "Bio is required.";
    if (!selfieFile)         e.selfie      = "Please upload a selfie photo.";
    if (!licenseFile)        e.license     = "Please upload your license document.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("https://localhost:7160/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseNumber: loginLicense, password: loginPassword, role: "Therapist" }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        sessionStorage.setItem("token",       data.token);
        sessionStorage.setItem("role",        "therapist");
        sessionStorage.setItem("therapistId", data.userId);
        setTimeout(() => navigate("/therapist-dashboard"), 800);
      } else {
        setError(data.message || "Login failed.");
      }
    } catch {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateStep1()) return;
    setLoading(true);
    try {
      const res  = await fetch("https://localhost:7160/api/Therapists/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName, phoneNumber, licenseNumber, password,
          specialties: [], bio: "", role: "Therapist",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegisteredId(data.id);
        setRegStep(STEP.PROFESSIONAL);
      } else {
        if (data.errors) {
          const se = {};
          if (data.errors.LicenseNumber) se.licenseNumber = data.errors.LicenseNumber[0];
          if (data.errors.PhoneNumber)   se.phoneNumber   = data.errors.PhoneNumber[0];
          setErrors(se);
        } else {
          setError(data.message || "Registration failed.");
        }
      }
    } catch {
      setError("Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("therapistId",          registeredId);
      form.append("claimedLicenseNumber", licenseNumber);
      form.append("selfieImage",          selfieFile);
      form.append("licenseImage",         licenseFile);

      // Fire-and-forget — verification runs async, UI moves on immediately
      fetch("https://localhost:7160/api/Therapists/verify", { method: "POST", body: form })
        .catch(() => {});

      setRegStep(STEP.PENDING);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input class ────────────────────────────────────────────────────
  const ic = (hasError) =>
    `w-full pl-10 pr-4 py-3 rounded-xl border bg-background text-foreground text-sm
     placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors
     ${hasError ? "border-destructive" : "border-border"}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">

          {/* Brand */}
          <div className="flex justify-center mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Briefcase size={16} className="text-primary" />
            </div>
          </div>
          <div className="text-center mb-6">
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Mind<span className="text-primary">Spot</span>{" "}
              <span className="text-sm font-normal text-muted-foreground tracking-wide uppercase">Pro</span>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Join our network of certified professionals</p>
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-6">
            {["Therapist Login", "Apply to Join"].map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => { setIsLogin(i === 0); setError(""); setErrors({}); setRegStep(STEP.DETAILS); }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  (i === 0 ? isLogin : !isLogin)
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* LOGIN */}
            {isLogin && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <FieldRow icon={Award} placeholder="License number (27-XXXXX)" value={loginLicense}  onChange={setLoginLicense}  ic={ic} />
                <FieldRow icon={Lock}  placeholder="Password"                  value={loginPassword} onChange={setLoginPassword} ic={ic} type="password" />
                {error && <ErrBox msg={error} />}
                <Button type="submit" className="w-full rounded-xl h-12 text-base font-medium" disabled={loading}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : "Sign In"}
                </Button>
              </motion.form>
            )}

            {/* STEP 1 */}
            {!isLogin && regStep === STEP.DETAILS && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepBar current={1} total={2} />
                <p className="text-sm font-semibold text-foreground mb-4">Step 1 — Personal Details</p>
                <form onSubmit={handleStep1Submit} className="space-y-3">
                  <FieldRow icon={User}  placeholder="Full name"                   value={fullName}      onChange={setFullName}      ic={ic} err={errors.fullName} />
                  <FieldRow icon={Phone} placeholder="Phone (e.g. 050-1234567)"    value={phoneNumber}   onChange={setPhoneNumber}   ic={ic} err={errors.phoneNumber} />
                  <FieldRow icon={Award} placeholder="License number (27-XXXXX)"   value={licenseNumber} onChange={setLicenseNumber} ic={ic} err={errors.licenseNumber} />
                  <FieldRow icon={Lock}  placeholder="Password"                    value={password}      onChange={setPassword}      ic={ic} type="password" err={errors.password} />
                  {error && <ErrBox msg={error} />}
                  <Button type="submit" className="w-full rounded-xl h-12 text-base font-medium" disabled={loading}>
                    {loading
                      ? <Loader2 size={18} className="animate-spin" />
                      : <span className="flex items-center gap-2">Continue <ChevronRight size={16} /></span>
                    }
                  </Button>
                </form>
              </motion.div>
            )}

            {/* STEP 2 */}
            {!isLogin && regStep === STEP.PROFESSIONAL && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <StepBar current={2} total={2} />
                <p className="text-sm font-semibold text-foreground mb-4">Step 2 — Professional Profile</p>
                <form onSubmit={handleStep2Submit} className="space-y-4">

                  {/* Specialties */}
                  <div className="space-y-1">
                    <div className="relative">
                      <Briefcase size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Specialties (comma separated)"
                        value={specialties}
                        onChange={(e) => setSpecialties(e.target.value)}
                        className={ic(!!errors.specialties)}
                      />
                    </div>
                    {errors.specialties && <p className="text-xs text-destructive ml-1">{errors.specialties}</p>}
                  </div>

                  {/* Bio */}
                  <div className="space-y-1">
                    <div className="relative">
                      <User size={15} className="absolute left-3 top-3.5 text-muted-foreground" />
                      <textarea
                        rows={3}
                        placeholder="Short professional bio…"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className={`${ic(!!errors.bio)} resize-none pt-3`}
                      />
                    </div>
                    {errors.bio && <p className="text-xs text-destructive ml-1">{errors.bio}</p>}
                  </div>

                  {/* Photo uploads */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verification Photos</p>

                    <FilePicker
                      label="Upload a selfie photo"
                      file={selfieFile}
                      onFile={setSelfieFile}
                      inputRef={selfieRef}
                      err={errors.selfie}
                    />
                    <FilePicker
                      label="Upload license / ID document"
                      file={licenseFile}
                      onFile={setLicenseFile}
                      inputRef={licenseRef}
                      err={errors.license}
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Used for identity verification only — never shown publicly.
                    </p>
                  </div>

                  {error && <ErrBox msg={error} />}

                  <div className="flex gap-3">
                    <Button
                      type="button" variant="outline" className="rounded-xl h-12 px-5"
                      onClick={() => { setRegStep(STEP.DETAILS); setErrors({}); setError(""); }}
                    >
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 rounded-xl h-12 text-base font-medium" disabled={loading}>
                      {loading ? <Loader2 size={18} className="animate-spin" /> : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: Pending */}
            {!isLogin && regStep === STEP.PENDING && (
              <motion.div
                key="s3"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-2"
              >
                <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock size={30} className="text-primary animate-pulse" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">Application Submitted!</h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                  We're running automated verification of your license and identity. This usually takes a few minutes.
                </p>

                <div className="mt-5 space-y-2 text-left">
                  {[
                    { label: "Personal details",    done: true  },
                    { label: "Professional profile", done: true  },
                    { label: "License verification", done: false },
                    { label: "Admin approval",       done: false },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-2.5 text-sm">
                      {done
                        ? <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                        : <Clock size={15} className="text-muted-foreground shrink-0 animate-pulse" />
                      }
                      <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  You'll be notified once your account is approved.
                </p>

                <Button
                  variant="outline" className="mt-5 rounded-xl"
                  onClick={() => { setIsLogin(true); setRegStep(STEP.DETAILS); setError(""); setErrors({}); }}
                >
                  Back to Login
                </Button>
              </motion.div>
            )}

          </AnimatePresence>

          {isLogin && (
            <div className="mt-5 text-center text-sm">
              <Link to="/patient-auth" className="text-muted-foreground hover:text-foreground transition-colors">
                Not a therapist? Patient portal →
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ── Micro-components ──────────────────────────────────────────────────────────
function FieldRow({ icon: Icon, placeholder, value, onChange, ic, type = "text", err }) {
  return (
    <div className="space-y-1">
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={ic(!!err)}
        />
      </div>
      {err && <p className="text-xs text-destructive ml-1">{err}</p>}
    </div>
  );
}

function ErrBox({ msg }) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-xl">
      {msg}
    </div>
  );
}

function StepBar({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i + 1 <= current ? "bg-primary" : "bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function FilePicker({ label, file, onFile, inputRef, err }) {
  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onFile(e.target.files[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed transition-colors text-sm
          ${err
            ? "border-destructive/50 bg-red-50"
            : file
              ? "border-green-400/60 bg-green-50"
              : "border-border hover:border-primary/50 hover:bg-primary/5 bg-background"
          }`}
      >
        {file
          ? <><CheckCircle2 size={15} className="text-green-600 shrink-0" /><span className="text-foreground truncate">{file.name}</span></>
          : <><Upload size={15} className="text-muted-foreground shrink-0" /><span className="text-muted-foreground">{label}</span></>
        }
      </button>
      {err && <p className="text-xs text-destructive mt-1 ml-1">{err}</p>}
    </div>
  );
}

export default TherapistAuthPage;
