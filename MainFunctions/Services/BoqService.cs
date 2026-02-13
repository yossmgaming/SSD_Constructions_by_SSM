using System;
using System.Linq;
using MainFunctions.Data;
using MainFunctions.Models;
using Microsoft.EntityFrameworkCore;

namespace MainFunctions.Services
{
    public class BoqService : IBoqService
    {
        private readonly AppDbContext _db;

        public BoqService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Boq> CreateBoqAsync(string title, string toAddress, string notes, DateTime? documentDate)
        {
            var boq = new Boq
            {
                Title = title ?? string.Empty,
                ToAddress = toAddress ?? string.Empty,
                Notes = notes ?? string.Empty,
                DocumentDate = documentDate ?? DateTime.UtcNow
            };

            _db.Boqs.Add(boq);
            await _db.SaveChangesAsync();
            return boq;
        }

        public async Task<Boq?> GetBoqWithItemsAsync(int boqId)
        {
            return await _db.Boqs.Include(b => b.Items).FirstOrDefaultAsync(b => b.Id == boqId);
        }

        public async Task AddItemAsync(int boqId, BoqItem item)
        {
            item.BoqId = boqId;
            item.Amount = item.Quantity * item.Rate;
            _db.BoqItems.Add(item);
            await _db.SaveChangesAsync();
            await RecalculateTotalsAsync(boqId);
        }

        public async Task UpdateItemAsync(BoqItem item)
        {
            item.Amount = item.Quantity * item.Rate;
            _db.BoqItems.Update(item);
            await _db.SaveChangesAsync();
        }

        public async Task DeleteItemAsync(int itemId)
        {
            var itm = await _db.BoqItems.FindAsync(itemId);
            if (itm == null) return;
            var boqId = itm.BoqId;
            _db.BoqItems.Remove(itm);
            await _db.SaveChangesAsync();
            await RecalculateTotalsAsync(boqId);
        }

        public async Task<decimal> RecalculateTotalsAsync(int boqId)
        {
            var totalDouble = await _db.BoqItems
                .Where(i => i.BoqId == boqId)
                .Select(i => (double)i.Amount)
                .SumAsync();
            return (decimal)totalDouble;
        }

        public async Task<Boq?> GetLatestBoqAsync()
        {
            return await _db.Boqs.Include(b => b.Items).OrderByDescending(b => b.CreatedAt).FirstOrDefaultAsync();
        }
    }
}