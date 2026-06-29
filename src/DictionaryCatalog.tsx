import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FlashcardTrainer } from './FlashcardTrainer';
import { translations } from './i18n';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

interface DictionaryDeck {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  cardCount: number;
  difficulty: 'Простой' | 'Средний' | 'Продвинутый';
  description: string;
  cards: Flashcard[];
}

const INITIAL_DECKS: DictionaryDeck[] = [
  {
    id: 'basic-phrases',
    title: 'Базовые фразы для выживания',
    category: 'basic',
    categoryLabel: 'Базовый',
    cardCount: 2,
    difficulty: 'Простой',
    description: 'Минимальный набор повседневных выражений для бытового общения.',
    cards: [
      { id: 'b1', front: 'How are you?', back: 'Как дела?', hint: 'Приветствие' },
      { id: 'b2', front: 'Thank you very much', back: 'Большое спасибо' }
    ]
  }
];

export const DictionaryCatalog: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [decks, setDecks] = useState<DictionaryDeck[]>(INITIAL_DECKS);
  
  // Переключение языка интерфейса
  const [lang, setLang] = useState<'ru' | 'en' | 'de'>('ru');
  const t = translations[lang] || translations['ru'];

  // Ключи и настройки провайдеров ИИ
  const [aiProvider, setAiProvider] = useState<'gemini' | 'deepseek'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrainingDeck, setActiveTrainingDeck] = useState<DictionaryDeck | null>(null);
  
  // Статистика
  const [userXP, setUserXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalLearned, setTotalLearned] = useState(0);

  useEffect(() => {
    setApiKey(localStorage.getItem('bx_gemini_key') || '');
    setDeepseekKey(localStorage.getItem('bx_deepseek_key') || '');
    setAiProvider((localStorage.getItem('bx_ai_provider') as 'gemini' | 'deepseek') || 'gemini');
    setLang((localStorage.getItem('bx_app_lang') as 'ru' | 'en' | 'de') || 'ru');
    
    setUserXP(parseInt(localStorage.getItem('bx_user_xp') || '0', 10));
    setStreak(parseInt(localStorage.getItem('bx_user_streak') || '0', 10));
    setTotalLearned(parseInt(localStorage.getItem('bx_total_learned') || '0', 10));

    const allKeys = Object.keys(localStorage);
    const loadedDecks: DictionaryDeck[] = [...INITIAL_DECKS];
    allKeys.forEach(key => {
      if (key.startsWith('bx_meta_deck_')) {
        try {
          loadedDecks.push(JSON.parse(localStorage.getItem(key) || ''));
        } catch (e) {
          console.error(e);
        }
      }
    });
    setDecks(loadedDecks);
  }, []);

  const handleSaveKey = (key: string, provider: 'gemini' | 'deepseek') => {
    if (provider === 'gemini') {
      setApiKey(key);
      localStorage.setItem('bx_gemini_key', key);
    } else {
      setDeepseekKey(key);
      localStorage.setItem('bx_deepseek_key', key);
    }
  };

  const handleProviderChange = (provider: 'gemini' | 'deepseek') => {
    setAiProvider(provider);
    localStorage.setItem('bx_ai_provider', provider);
  };

  const handleLangChange = (newLang: 'ru' | 'en' | 'de') => {
    setLang(newLang);
    localStorage.setItem('bx_app_lang', newLang);
  };

  const handleGenerateWithAI = async () => {
    const currentKey = aiProvider === 'gemini' ? apiKey : deepseekKey;
    if (!currentKey) return alert("Missing API key!");
    if (!aiPrompt.trim()) return alert("Enter prompt!");
    
    setIsLoading(true);

    const systemInstruction = `
      Ты — профессиональный генератор учебных материалов. Создай колоду учебных карточек на тему: "\${aiPrompt}".
      Ты должен вернуть СТРОГО валидный JSON-объект без какого-либо окружающего текста и без разметки markdown (\`\`\`json).
      Текст внутри карточек (ответы, описания) генерируй на языке запроса пользователя.
      
      Шаблон JSON:
      {
        "id": "ai_deck_${Date.now()}",
        "title": "Название темы",
        "category": "custom",
        "categoryLabel": "AI",
        "cardCount": 10,
        "difficulty": "Средний",
        "description": "Описание набора",
        "cards": [
          { "id": "c1", "front": "Слово", "back": "Перевод/Значение", "hint": "Пример предложения" }
        ]
      }
      Сделай ровно 10 карточек.
    `;

    try {
      let responseText = "";
      if (aiProvider === 'gemini') {
        const genAI = new GoogleGenerativeAI(currentKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(systemInstruction);
        responseText = result.response.text().trim();
      } else {
        const response = await fetch('https://deepseek.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentKey}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: systemInstruction }],
            temperature: 0.3,
            response_format: { type: "json_object" }
          })
        });
        const data = await response.json();
        responseText = data.choices.message.content.trim();
      }

      if (responseText.includes('```')) {
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      }

      const generatedDeck: DictionaryDeck = JSON.parse(responseText);
      localStorage.setItem(`bx_meta_deck_${generatedDeck.id}`, JSON.stringify(generatedDeck));
      setDecks(prev => [generatedDeck, ...prev]);
      setAiPrompt('');
    } catch (error) {
      console.error(error);
      alert("Error generating deck");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLearning = (deckId: string) => {
    const selectedDeck = decks.find(d => d.id === deckId);
    if (selectedDeck) setActiveTrainingDeck(selectedDeck);
  };

  const handleFinishTraining = (xpEarned: number, wordsCount: number) => {
    const newXP = userXP + xpEarned;
    const newLearned = totalLearned + wordsCount;
    setUserXP(newXP);
    setTotalLearned(newLearned);
    localStorage.setItem('bx_user_xp', newXP.toString());
    localStorage.setItem('bx_total_learned', newLearned.toString());
    setActiveTrainingDeck(null);
  };

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || deck.category === activeCategory;
    return matchesSearch && matchesCategory;
  });
  if (activeTrainingDeck) {
    return (
      <FlashcardTrainer 
        deckTitle={activeTrainingDeck.title} 
        cards={activeTrainingDeck.cards} 
        onClose={() => setActiveTrainingDeck(null)} 
        onFinish={handleFinishTraining}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Переключатель языков интерфейса */}
        <div className="flex justify-end gap-1 text-[11px]">
          {(['ru', 'en', 'de'] as ('ru' | 'en' | 'de')[]).map(l => (
            <button
              key={l}
              onClick={() => handleLangChange(l)}
              className={`px-2 py-1 rounded uppercase font-bold transition-colors ${
                lang === l ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500 hover:text-slate-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        
        {/* Шапка Личного Кабинета */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-md shadow-indigo-600/20">
              U
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">{t.cabinet}</div>
              <div className="text-sm font-bold text-slate-200">
                {userXP} XP • {t.level} {Math.floor(userXP / 100) + 1}
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 font-bold uppercase">{t.days}</span>
              <span className="text-sm font-extrabold text-amber-500"> {streak}</span>
            </div>
            <div className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 font-bold uppercase">{t.words}</span>
              <span className="text-sm font-extrabold text-emerald-400"> {totalLearned}</span>
            </div>
          </div>
        </div>

        {/* Настройка провайдера и ключа ИИ */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-medium">{t.aiProvider}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handleProviderChange('gemini')}
                className={`px-2 py-1 rounded font-bold transition-colors ${aiProvider === 'gemini' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-500'}`}
              >
                Gemini
              </button>
              <button 
                onClick={() => handleProviderChange('deepseek')}
                className={`px-2 py-1 rounded font-bold transition-colors ${aiProvider === 'deepseek' ? 'bg-indigo-600 text-white' : 'bg-slate-950 text-slate-500'}`}
              >
                DeepSeek
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">API Key:</span>
            <input
              type="password"
              placeholder={t.apiKeyPlaceholder}
              value={aiProvider === 'gemini' ? apiKey : deepseekKey}
              onChange={(e) => handleSaveKey(e.target.value, aiProvider)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 w-52 font-mono text-[10px]"
            />
          </div>
        </div>

        {/* ИИ Генератор колод */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
              {t.aiGeneratorTitle}
            </h2>
            <p className="text-slate-500 text-[11px]">{t.aiGeneratorSub}</p>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder={t.aiInputPlaceholder}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleGenerateWithAI}
              disabled={isLoading || (aiProvider === 'gemini' ? !apiKey : !deepseekKey)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t.btnGenerating}</span>
                </>
              ) : t.btnGenerate}
            </button>
          </div>
        </div>

        {/* Шапка Поиска и Фильтры */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: t.catAll },
              { id: 'basic', label: t.catBasic },
              { id: 'custom', label: t.catAi }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Список колод */}
        <div className="space-y-3">
          {filteredDecks.map(deck => (
            <div key={deck.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
              <div className="space-y-2">
                <div className="flex gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                  <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">{deck.category === 'custom' ? t.catAi : deck.categoryLabel}</span>
                  <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded">{deck.difficulty}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">{deck.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed font-normal">{deck.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[11px]">
                <span className="text-slate-500 font-medium">{deck.cardCount} {t.phrases}</span>
                <button
                  onClick={() => handleStartLearning(deck.id)}
                  className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-lg text-xs transition-all active:scale-95"
                >
                  {t.btnLearn}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

