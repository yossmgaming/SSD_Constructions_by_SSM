// ============================================
// useAICommand Hook
// React wrapper for AI Command Orchestrator
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../data/supabase';
import { aiCommandOrchestrator } from '../ai-core/AICommandOrchestrator';

export function useAICommand() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [error, setError] = useState(null);
  const [commandOverview, setCommandOverview] = useState(null);

  const processCommand = useCallback(async (userInput) => {
    setIsProcessing(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user role from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = profile?.role || 'worker';
      const userId = user.id;

      const result = await aiCommandOrchestrator.process(userInput, userId, userRole);
      
      setLastResult(result);
      
      if (!result.success) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const loadCommandOverview = useCallback(async () => {
    try {
      const overview = await aiCommandOrchestrator.getCommandOverview();
      setCommandOverview(overview);
      return overview;
    } catch (err) {
      console.error('Failed to load command overview:', err);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    processCommand,
    loadCommandOverview,
    commandOverview,
    isProcessing,
    lastResult,
    error,
    clearError
  };
}

export default useAICommand;
