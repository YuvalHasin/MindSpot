using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Models;
using server.Repositories;

namespace server.Controllers
{
    [Authorize] 
    [ApiController]
    [Route("api/[controller]")]
    public class LegoController : ControllerBase
    {
        private readonly ILegoRepository _repository;

        public LegoController(ILegoRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public IActionResult GetAll() => Ok(_repository.GetAll());

        [HttpPost]
        public IActionResult Add([FromBody] LegoSet set)
        {
            _repository.Add(set);
            return Ok(set);
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            _repository.Delete(id);
            return NoContent();
        }
    }
}