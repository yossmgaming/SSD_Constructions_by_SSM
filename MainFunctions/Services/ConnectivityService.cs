using System.Net.NetworkInformation;
using System.Threading.Tasks;

namespace MainFunctions.Services
{
    public static class ConnectivityService
    {
        public static async Task<bool> IsConnectedAsync()
        {
            // The host to ping. Using the database pooler host is a reliable
            // way to check if the specific resource we need is available.
            const string host = "aws-1-ap-northeast-1.pooler.supabase.com";

            try
            {
                using (var ping = new Ping())
                {
                    // Use a short timeout to avoid long waits if offline.
                    var reply = await ping.SendPingAsync(host, 2000); 
                    return reply.Status == IPStatus.Success;
                }
            }
            catch (PingException)
            {
                // This can happen if the host name cannot be resolved,
                // which is a clear indicator of being offline.
                return false;
            }
        }
    }
}
