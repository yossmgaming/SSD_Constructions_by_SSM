```

BenchmarkDotNet v0.13.8, Windows 10 (10.0.19045.6466/22H2/2022Update)
Intel Core i7 CPU 860 2.80GHz (Nehalem), 1 CPU, 8 logical and 4 physical cores
.NET SDK 9.0.305
  [Host]     : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT SSE4.2
  DefaultJob : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT SSE4.2


```
| Method                           | Mean        | Error     | StdDev    | Gen0     | Gen1     | Allocated  |
|--------------------------------- |------------:|----------:|----------:|---------:|---------:|-----------:|
| LoadAdvances_InMemoryAggregation | 36,041.2 μs | 717.63 μs | 671.27 μs | 600.0000 | 400.0000 | 3267.57 KB |
| ApplyAdvance_Insert              |    360.5 μs |   6.70 μs |   6.58 μs |  13.6719 |   0.9766 |   56.63 KB |
