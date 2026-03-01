using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainFunctions.Data.Migrations
{
    /// <inheritdoc />
    public partial class ProviderChecksAndRowVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "ObligationHeaders");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "CashSettlements");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "AdvanceApplications");

            migrationBuilder.AddCheckConstraint(
                name: "CK_CashSettlement_Amount_NonNegative",
                table: "CashSettlements",
                sql: "Amount >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AdvanceApplication_AppliedAmount_Positive",
                table: "AdvanceApplications",
                sql: "AppliedAmount > 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_CashSettlement_Amount_NonNegative",
                table: "CashSettlements");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AdvanceApplication_AppliedAmount_Positive",
                table: "AdvanceApplications");

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "ObligationHeaders",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "CashSettlements",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "AdvanceApplications",
                type: "BLOB",
                rowVersion: true,
                nullable: true);
        }
    }
}
