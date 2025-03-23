import React, { useState, useEffect, useCallback } from 'react';
import { Timer, RefreshCw, Trophy, Activity, X, AlertCircle, Pause, Brain, History, ChevronLeft } from 'lucide-react';

const sampleTexts = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "How vexingly quick daft zebras jump!",
  "The five boxing wizards jump quickly.",
  "Sphinx of black quartz, judge my vow.",
];

interface Stats {
  wpm: number;
  accuracy: number;
  time: number;
  errors: number;
  pauses: PauseInfo[];
  errorDetails: ErrorDetail[];
  suggestions: string[];
  text: string;
  timestamp: number;
}

interface PauseInfo {
  position: number;
  duration: number;
  character: string;
}

interface ErrorDetail {
  position: number;
  expected: string;
  actual: string;
}

function App() {
  const [text, setText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [lastTypeTime, setLastTypeTime] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<Stats[]>([]);
  const [stats, setStats] = useState<Stats>({
    wpm: 0,
    accuracy: 0,
    time: 0,
    errors: 0,
    pauses: [],
    errorDetails: [],
    suggestions: [],
    text: '',
    timestamp: Date.now()
  });
  const [showModal, setShowModal] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);

  const generateNewText = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * sampleTexts.length);
    setText(sampleTexts[randomIndex]);
    setUserInput('');
    setIsStarted(false);
    setIsFinished(false);
    setStartTime(null);
    setLastTypeTime(null);
    setShowModal(false);
    setIsImmersive(false);
    setStats({
      wpm: 0,
      accuracy: 0,
      time: 0,
      errors: 0,
      pauses: [],
      errorDetails: [],
      suggestions: [],
      text: sampleTexts[randomIndex],
      timestamp: Date.now()
    });
  }, []);

  useEffect(() => {
    generateNewText();
  }, [generateNewText]);

  const generateSuggestions = (errorDetails: ErrorDetail[], pauses: PauseInfo[]): string[] => {
    const suggestions: string[] = [];
    
    const commonErrors = errorDetails.reduce((acc: { [key: string]: number }, error) => {
      const key = `${error.expected}→${error.actual}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const mostCommonError = Object.entries(commonErrors).sort((a, b) => b[1] - a[1])[0];
    if (mostCommonError) {
      const [chars] = mostCommonError;
      const [expected, actual] = chars.split('→');
      suggestions.push(`Practice typing '${expected}' as you frequently mistype it as '${actual}'`);
    }

    const longPauses = pauses.filter(p => p.duration > 1000);
    if (longPauses.length > 0) {
      const problematicChars = longPauses
        .map(p => p.character)
        .filter((char, index, self) => self.indexOf(char) === index)
        .join("', '");
      suggestions.push(`Work on improving speed with characters: '${problematicChars}'`);
    }

    if (stats.wpm < 30) {
      suggestions.push("Focus on accuracy first, then gradually increase your speed");
    } else if (stats.accuracy < 90) {
      suggestions.push("Slow down slightly to improve accuracy");
    }

    return suggestions;
  };

  const calculateStats = useCallback(() => {
    if (!startTime) return;
    
    const currentTime = Date.now();
    const timeInSeconds = (currentTime - startTime) / 1000;
    const words = text.trim().split(' ').length;
    const wpm = Math.round((words / timeInSeconds) * 60);
    
    let correctChars = 0;
    let errors = 0;
    const errorDetails: ErrorDetail[] = [];
    const minLength = Math.min(text.length, userInput.length);
    
    for (let i = 0; i < minLength; i++) {
      if (text[i] === userInput[i]) {
        correctChars++;
      } else {
        errors++;
        errorDetails.push({
          position: i,
          expected: text[i],
          actual: userInput[i]
        });
      }
    }
    
    const lengthDiff = Math.abs(text.length - userInput.length);
    errors += lengthDiff;
    
    if (text.length > userInput.length) {
      for (let i = userInput.length; i < text.length; i++) {
        errorDetails.push({
          position: i,
          expected: text[i],
          actual: ''
        });
      }
    }
    
    const accuracy = Math.round((correctChars / text.length) * 100);

    const newStats = {
      wpm,
      accuracy,
      time: Math.round(timeInSeconds),
      errors,
      pauses: stats.pauses,
      errorDetails,
      suggestions: generateSuggestions(errorDetails, stats.pauses),
      text,
      timestamp: Date.now()
    };
    
    setStats(newStats);
    return newStats;
  }, [startTime, text, userInput, stats.pauses]);

  useEffect(() => {
    if (isStarted && !isFinished) {
      const interval = setInterval(() => {
        calculateStats();
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isStarted, isFinished, calculateStats]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentTime = Date.now();
    
    if (!isStarted && value) {
      setIsStarted(true);
      setStartTime(currentTime);
      setLastTypeTime(currentTime);
      setIsImmersive(true);
    } else if (lastTypeTime) {
      const pauseDuration = currentTime - lastTypeTime;
      if (pauseDuration > 500) {
        setStats(prev => ({
          ...prev,
          pauses: [...prev.pauses, {
            position: value.length - 1,
            duration: pauseDuration,
            character: text[value.length - 1] || ''
          }]
        }));
      }
    }
    
    setLastTypeTime(currentTime);
    setUserInput(value);
    
    if (value.length >= text.length) {
      setIsFinished(true);
      setIsImmersive(false);
      const finalStats = calculateStats();
      if (finalStats) {
        setHistory(prev => [finalStats, ...prev]);
        setShowModal(true);
      }
    }
  };

  const getCharacterClass = (index: number) => {
    if (!userInput[index]) return 'text-gray-500';
    return userInput[index] === text[index] ? 'text-green-500' : 'text-red-500';
  };

  if (showHistory) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <button
              onClick={() => setShowHistory(false)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back to Typing Test
            </button>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-8">Typing History</h2>

          <div className="grid gap-6">
            {history.map((record, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">WPM</p>
                        <p className="text-xl font-bold">{record.wpm}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Activity className="w-6 h-6 text-green-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Accuracy</p>
                        <p className="text-xl font-bold">{record.accuracy}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Errors</p>
                        <p className="text-xl font-bold">{record.errors}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Timer className="w-6 h-6 text-blue-500 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="text-xl font-bold">{record.time}s</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(record.timestamp).toLocaleString()}
                  </p>
                  <p className="text-gray-700 font-medium mb-4">"{record.text}"</p>
                  
                  {record.suggestions.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <Brain className="w-5 h-5 text-indigo-500 mr-2" />
                        <h4 className="font-medium">Suggestions</h4>
                      </div>
                      <ul className="list-disc list-inside space-y-1">
                        {record.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-gray-600">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isImmersive ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto p-4">
        {!isImmersive && (
          <div className="flex justify-between items-center mb-8">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <History className="w-5 h-5 mr-2" />
              View History
            </button>
            <h1 className="text-4xl font-bold text-gray-900">Speed Typing Test</h1>
            <div className="w-24"></div>
          </div>
        )}

        <div className={`transition-all duration-300 ${
          isImmersive 
            ? 'fixed inset-0 flex items-center justify-center bg-gray-900 z-50' 
            : 'bg-white rounded-2xl shadow-xl p-8 mb-8'
        }`}>
          <div className={`max-w-2xl w-full ${isImmersive ? 'p-8' : ''}`}>
            <div className={`mb-6 text-2xl font-mono ${isImmersive ? 'text-white' : 'text-gray-800'}`}>
              {text.split('').map((char, index) => (
                <span key={index} className={
                  isImmersive
                    ? userInput[index] === undefined
                      ? 'text-gray-500'
                      : userInput[index] === char
                        ? 'text-green-400'
                        : 'text-red-400'
                    : getCharacterClass(index)
                }>
                  {char}
                </span>
              ))}
            </div>

            <input
              type="text"
              value={userInput}
              onChange={handleInput}
              disabled={isFinished}
              className={`w-full p-4 border-2 rounded-lg focus:outline-none transition-colors ${
                isImmersive
                  ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500'
                  : 'border-gray-200 focus:border-blue-500'
              }`}
              placeholder="Start typing here..."
            />
          </div>
        </div>

        {/* Live Stats */}
        {isStarted && !showModal && !isImmersive && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-sm text-gray-600">WPM</span>
              </div>
              <span className="text-xl font-bold">{stats.wpm}</span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Activity className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-sm text-gray-600">Accuracy</span>
              </div>
              <span className="text-xl font-bold">{stats.accuracy}%</span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm text-gray-600">Errors</span>
              </div>
              <span className="text-xl font-bold">{stats.errors}</span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Timer className="w-5 h-5 text-blue-500 mr-2" />
                <span className="text-sm text-gray-600">Time</span>
              </div>
              <span className="text-xl font-bold">{stats.time}s</span>
            </div>
          </div>
        )}

        {/* Stats Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 relative">
              <button
                onClick={generateNewText}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Detailed Analysis</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Trophy className="w-8 h-8 text-yellow-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">WPM</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.wpm}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Activity className="w-8 h-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Accuracy</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.accuracy}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Errors</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.errors}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Timer className="w-8 h-8 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm text-gray-600">Time</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.time}s</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {stats.pauses.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <Pause className="w-6 h-6 text-purple-500 mr-2" />
                        <h3 className="text-lg font-semibold">Pause Analysis</h3>
                      </div>
                      <div className="space-y-2">
                        {stats.pauses.map((pause, index) => (
                          <p key={index} className="text-sm text-gray-600">
                            Paused for {(pause.duration / 1000).toFixed(1)}s at character '{pause.character}'
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {stats.errorDetails.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                        <h3 className="text-lg font-semibold">Error Details</h3>
                      </div>
                      <div className="space-y-2">
                        {stats.errorDetails.map((error, index) => (
                          <p key={index} className="text-sm text-gray-600">
                            Position {error.position + 1}: Expected '{error.expected}' but got '{error.actual || 'nothing'}'
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <Brain className="w-6 h-6 text-indigo-500 mr-2" />
                      <h3 className="text-lg font-semibold">Suggestions for Improvement</h3>
                    </div>
                    <ul className="list-disc list-inside space-y-2">
                      {stats.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={generateNewText}
                className="mt-8 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        )}

        {!showModal && !isImmersive && (
          <div className="text-center">
            <button
              onClick={generateNewText}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;