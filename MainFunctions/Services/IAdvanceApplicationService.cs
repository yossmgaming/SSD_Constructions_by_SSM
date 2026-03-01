using System.Threading.Tasks;

namespace MainFunctions.Services
{
    public interface IAdvanceApplicationService
    {
        Task ApplyAdvanceAsync(int advanceId, int obligationHeaderId, decimal amount, int userId);
    }
}
