using System;
using System.Collections.Concurrent;
using System.IO;
using Microsoft.Extensions.Logging;

namespace MainFunctions.Services
{
    // Simple file logger provider for desktop app scenarios.
    public class FileLoggerProvider : ILoggerProvider
    {
        private readonly string _path;
        private readonly ConcurrentDictionary<string, FileLogger> _loggers = new();

        public FileLoggerProvider(string path)
        {
            _path = path;
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir)) Directory.CreateDirectory(dir);
        }

        public ILogger CreateLogger(string categoryName)
        {
            return _loggers.GetOrAdd(categoryName, name => new FileLogger(_path));
        }

        public void Dispose()
        {
            // nothing to dispose for simple implementation
        }
    }

    internal class FileLogger : ILogger
    {
        private readonly string _path;
        private static readonly object _sync = new object();

        public FileLogger(string path)
        {
            _path = path;
        }

        // Explicit interface implementation to avoid nullable-constraint warnings
        IDisposable ILogger.BeginScope<TState>(TState state) => new NoopDisposable();

        public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            try
            {
                var msg = formatter(state, exception);
                var line = $"{DateTime.UtcNow:o} [{logLevel}] {msg}" + (exception != null ? ("\n" + exception) : string.Empty);
                lock (_sync)
                {
                    File.AppendAllText(_path, line + Environment.NewLine);
                }
            }
            catch
            {
                // swallow logging errors
            }
        }

        private class NoopDisposable : IDisposable
        {
            public void Dispose() { }
        }
    }
}
