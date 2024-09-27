import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [essay, setEssay] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [essayType, setEssayType] = useState('medium');
  const [gradingParams, setGradingParams] = useState({
    min_word_count: 300,
    max_word_count: 600,
    grammar_weight: 0.35,
    vocabulary_weight: 0.35,
    creativity_weight: 0.3
  });
  const [isGrading, setIsGrading] = useState(false);

  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setGradingParams(prev => ({
      ...prev,
      [name]: name.includes('weight') ? parseFloat(value) : parseInt(value)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsGrading(true);

    try {
      const response = await axios.post('http://127.0.0.1:8000/grade', {
        essay_input: { essay: essay },
        essay_type: essayType,
        grading_params: gradingParams
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error submitting the essay:', error);
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <h1 className="text-4xl font-bold mb-5 text-gray-800">AI Essay Grading</h1>
          <form onSubmit={handleSubmit} className="mb-5">
            <div className="mb-4">
              <label htmlFor="essayType" className="block text-sm font-medium text-gray-700">Essay Type</label>
              <select
                id="essayType"
                value={essayType}
                onChange={(e) => setEssayType(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>
            {/* Add input fields for grading parameters */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="min_word_count" className="block text-sm font-medium text-gray-700">Min Word Count</label>
                <input
                  type="number"
                  id="min_word_count"
                  name="min_word_count"
                  value={gradingParams.min_word_count}
                  onChange={handleParamChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="max_word_count" className="block text-sm font-medium text-gray-700">Max Word Count</label>
                <input
                  type="number"
                  id="max_word_count"
                  name="max_word_count"
                  value={gradingParams.max_word_count}
                  onChange={handleParamChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="grammar_weight" className="block text-sm font-medium text-gray-700">Grammar Weight</label>
                
                <input
                  type="number"
                  id="grammar_weight"
                  name="grammar_weight"
                  value={gradingParams.grammar_weight}
                  onChange={handleParamChange}
                  step="0.01"
                  min="0"
                  max="1"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="vocabulary_weight" className="block text-sm font-medium text-gray-700">Vocabulary Weight</label>
                <input
                  type="number"
                  id="vocabulary_weight"
                  name="vocabulary_weight"
                  value={gradingParams.vocabulary_weight}
                  onChange={handleParamChange}
                  step="0.01"
                  min="0"
                  max="1"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="creativity_weight" className="block text-sm font-medium text-gray-700">Creativity Weight</label>
                <input
                  type="number"
                  id="creativity_weight"
                  name="creativity_weight"
                  value={gradingParams.creativity_weight}
                  onChange={handleParamChange}
                  step="0.01"
                  min="0"
                  max="1"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <textarea
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
              rows="10"
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none"
              placeholder="Enter your essay here"
            ></textarea>
            <button
              type="submit"
              disabled={loading}
              className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              {loading ? 'Grading...' : 'Grade Essay'}
            </button>
          </form>

          {result && (
            <div className="mt-5 overflow-hidden">
              <div className="px-6 py-4 overflow-hidden">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Grading Results</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-800">Overall Score</h3>
                    <p className="text-3xl font-bold text-blue-600">{result.score}/10</p>
                  </div>
                  {result.grammar_score !== null && (
                    <div className="bg-green-100 p-4 rounded-lg">
                      <h3 className="font-semibold text-green-800">Grammar Score</h3>
                      <p className="text-3xl font-bold text-green-600">{result.grammar_score}/10</p>
                    </div>
                  )}
                  {result.vocabulary_score !== null && (
                    <div className="bg-purple-100 p-4 rounded-lg">
                      <h3 className="font-semibold text-purple-800">Vocabulary Score</h3>
                      <p className="text-3xl font-bold text-purple-600">{result.vocabulary_score}/10</p>
                    </div>
                  )}
                  {result.creativity_score !== null && (
                    <div className="bg-yellow-100 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800">Creativity Score</h3>
                      <p className="text-3xl font-bold text-yellow-600">{result.creativity_score}/10</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-pink-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-pink-800">Error Rate</h3>
                    <p className="text-3xl font-bold text-pink-600">{result.error_rate}%</p>
                  </div>
                  <div className="bg-indigo-100 p-4 rounded-lg">
                    <h3 className="font-semibold text-indigo-800">Total Words</h3>
                    <p className="text-3xl font-bold text-indigo-600">{result.total_words}</p>
                  </div>
                </div>
                <div className="bg-white shadow-md rounded-lg overflow-hidden mt-4">
                  <div className="px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Feedback</h2>
                    <div className="space-y-3">
                      {result.feedback.map((item, index) => (
                        <div key={index} className="bg-white shadow-sm rounded-lg p-3">
                          <p className="text-gray-600">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-white shadow-md rounded-lg overflow-hidden mt-4">
                  <div className="px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Original Essay</h2>
                    <p className="mt-2 text-gray-600 bg-gray-100 p-3 rounded">{result.original_essay}</p>
                  </div>
                </div>
                <div className="bg-white shadow-md rounded-lg overflow-hidden mt-4">
                  <div className="px-6 py-4">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Corrected Essay</h2>
                    <p className="mt-2 text-gray-600 bg-gray-100 p-3 rounded">{result.corrected_essay}</p>
                  </div>
                </div>
                {result.detailed_errors && result.detailed_errors.length > 0 && (
                  <div className="bg-white shadow-md rounded-lg overflow-hidden mt-4">
                    <div className="px-6 py-4">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Detailed Errors</h2>
                      <div className="space-y-3">
                        {result.detailed_errors.map((error, index) => (
                          <div key={index} className="bg-white shadow-sm rounded-lg p-3">
                            <p className="text-gray-600">
                              <span className="font-semibold">{error.type} Error: </span>
                              <span className="line-through text-red-500">{error.original}</span>
                              {' → '}
                              <span className="text-green-500">{error.corrected}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {isGrading && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
              <div className="p-8 bg-white rounded-md shadow-xl">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-center mt-4 text-xl font-semibold">Grading your essay...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
