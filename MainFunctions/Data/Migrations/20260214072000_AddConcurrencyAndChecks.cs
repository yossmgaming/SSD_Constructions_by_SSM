using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MainFunctions.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddConcurrencyAndChecks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "Workers",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "Settlements",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "ProjectWorkers",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "Projects",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "ProjectMaterials",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "Payments",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "PaymentLines",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "PaymentHeaders",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "Materials",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "Boqs",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "BoqItems",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "_concurrencyToken",
                table: "Attendances",
                type: "BLOB",
                rowVersion: true,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AdvanceApplications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AdvanceSettlementId = table.Column<int>(type: "INTEGER", nullable: false),
                    ObligationHeaderId = table.Column<int>(type: "INTEGER", nullable: false),
                    AppliedAmount = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true),
                    _concurrencyToken = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdvanceApplications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ObligationHeaders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Type = table.Column<string>(type: "TEXT", nullable: false),
                    Direction = table.Column<string>(type: "TEXT", nullable: false),
                    ProjectId = table.Column<int>(type: "INTEGER", nullable: true),
                    EntityType = table.Column<string>(type: "TEXT", nullable: false),
                    EntityId = table.Column<int>(type: "INTEGER", nullable: true),
                    PeriodStart = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PeriodEnd = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DueDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    TotalAmountSnapshot = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Status = table.Column<string>(type: "TEXT", nullable: false),
                    IsLocked = table.Column<bool>(type: "INTEGER", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ModifiedByUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true),
                    _concurrencyToken = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObligationHeaders", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Suppliers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Contact = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    IsActive = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    _concurrencyToken = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Suppliers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CashSettlements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ObligationHeaderId = table.Column<int>(type: "INTEGER", nullable: true),
                    Date = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Amount = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Direction = table.Column<string>(type: "TEXT", nullable: false),
                    Method = table.Column<string>(type: "TEXT", nullable: false),
                    FromEntityType = table.Column<string>(type: "TEXT", nullable: false),
                    FromEntityId = table.Column<int>(type: "INTEGER", nullable: true),
                    ToEntityType = table.Column<string>(type: "TEXT", nullable: false),
                    ToEntityId = table.Column<int>(type: "INTEGER", nullable: true),
                    ReferenceNo = table.Column<string>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", nullable: false),
                    EnteredByUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsReversal = table.Column<bool>(type: "INTEGER", nullable: false),
                    ReversesSettlementId = table.Column<int>(type: "INTEGER", nullable: true),
                    ModifiedByUserId = table.Column<int>(type: "INTEGER", nullable: true),
                    ModifiedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true),
                    _concurrencyToken = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashSettlements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashSettlements_ObligationHeaders_ObligationHeaderId",
                        column: x => x.ObligationHeaderId,
                        principalTable: "ObligationHeaders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ObligationLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ObligationHeaderId = table.Column<int>(type: "INTEGER", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    Quantity = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    UnitRate = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    Amount = table.Column<decimal>(type: "NUMERIC", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    _concurrencyToken = table.Column<byte[]>(type: "BLOB", rowVersion: true, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ObligationLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ObligationLines_ObligationHeaders_ObligationHeaderId",
                        column: x => x.ObligationHeaderId,
                        principalTable: "ObligationHeaders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdvanceApplications_AdvanceSettlementId",
                table: "AdvanceApplications",
                column: "AdvanceSettlementId");

            migrationBuilder.CreateIndex(
                name: "IX_AdvanceApplications_ObligationHeaderId",
                table: "AdvanceApplications",
                column: "ObligationHeaderId");

            migrationBuilder.CreateIndex(
                name: "IX_CashSettlements_ObligationHeaderId",
                table: "CashSettlements",
                column: "ObligationHeaderId");

            migrationBuilder.CreateIndex(
                name: "IX_ObligationHeaders_Type_EntityId_ProjectId_PeriodStart_PeriodEnd",
                table: "ObligationHeaders",
                columns: new[] { "Type", "EntityId", "ProjectId", "PeriodStart", "PeriodEnd" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ObligationLines_ObligationHeaderId",
                table: "ObligationLines",
                column: "ObligationHeaderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdvanceApplications");

            migrationBuilder.DropTable(
                name: "CashSettlements");

            migrationBuilder.DropTable(
                name: "ObligationLines");

            migrationBuilder.DropTable(
                name: "Suppliers");

            migrationBuilder.DropTable(
                name: "ObligationHeaders");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "Workers");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "Settlements");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "ProjectWorkers");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "ProjectMaterials");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "PaymentLines");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "PaymentHeaders");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "Boqs");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "BoqItems");

            migrationBuilder.DropColumn(
                name: "_concurrencyToken",
                table: "Attendances");
        }
    }
}
