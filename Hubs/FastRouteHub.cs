using Microsoft.AspNet.SignalR;

namespace FastTrakWebUI.Hubs
{
    public class FastRouteHub : Hub
    {
        public void Hello()
        {
            Clients.All.hello();
        }

        public void BroadcastServiceStateChanged(string NewState)
        {
            Clients.All.serviceStateChanged(NewState);
        }

        public void BroadcastGridEntry(string engineID, string category, string data, bool updateEntry)
        {
            Clients.All.broadcastGridEntry(engineID, category, data, updateEntry);
        }

        public void BroadcastMessage(string engineID, string category, string message)
        {
            Clients.All.broadcastMessage(engineID, category, message);
        }

        public void BroadcastControllerStateChanged(string newstate)
        {
            Clients.All.broadcastStateChanged(newstate);
        }

        public void BroadcastEngineStateChanged(string engineID, string newstate)
        {
            Clients.All.broadcastStateChanged(engineID, newstate);
        }

        public void BroadcastLastComm(string engineID, string lastComm)
        {
            Clients.All.broadcastLastComm(engineID, lastComm);
        }
    }
}