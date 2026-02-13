using System;
using System.Collections.Generic;
using System.Threading.Tasks; // Add this for Task
using MainFunctions.Models;

namespace MainFunctions.Services
{
    public interface IBoqService
    {
        Task<Boq> CreateBoqAsync(string title, string toAddress, string notes, DateTime? documentDate);
        Task<Boq?> GetBoqWithItemsAsync(int boqId);
        Task AddItemAsync(int boqId, BoqItem item);
        Task UpdateItemAsync(BoqItem item);
        Task DeleteItemAsync(int itemId);
        Task<decimal> RecalculateTotalsAsync(int boqId);
        Task<Boq?> GetLatestBoqAsync();
    }
}