This project uses EF Core migrations. After adding concurrency tokens and CHECK constraints, run:

    dotnet ef migrations add AddConcurrencyAndChecks
    dotnet ef database update

Provider-specific SQL for CHECK constraints will be added in the generated migration where necessary.
