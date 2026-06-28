import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FlashcardTrainer } from './FlashcardTrainer';

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
  const [installedDeckIds, setInstalledDeckIds] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrainingDeck, setActiveTrainingDeck] = useState<DictionaryDeck | null>(null);

  const [userXP, setUserXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalLearned, setTotalLearned] = useState(0);

  useEffect(() => {
    const savedKey = localStorage.getItem('bx_gemini_key') || '';
    setApiKey(savedKey);

    const xp = parseInt(localStorage.getItem('bx_user_xp') || '0', 10);
    const savedStreak = parseInt(localStorage.getItem('bx_user_streak') || '0', 10);
    const learnedCount = parseInt(localStorage.getItem('bx_total_learned') || '0', 10);
    setUserXP(xp);
    setStreak(savedStreak);
    setTotalLearned(learnedCount);

    const lastDate = localStorage.getItem('bx_last_study_date');
    const today = new Date().toDateString();
    if (lastDate && lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastDate !== yesterday.toDateString()) {
        setStreak(0);
        localStorage.setItem('bx_user_streak', '0');
      }
    }

    const allKeys = Object.keys(localStorage);
    const loadedDecks: DictionaryDeck[] = [...INITIAL_DECKS];
    const installedIds: string[] = [];

    allKeys.forEach(key => {
      if (key.startsWith('bx_meta_deck_')) {
        try {
          const deckData = JSON.parse(localStorage.getItem(key) || '');
          loadedDecks.push(deckData);
        } catch (e) {
          console.error("Ошибка чтения колоды", e);
        }
      }
      if (key.startsWith('bx_installed_')) {
        installedIds.push(key.replace('bx_installed_', ''));
      }
    });

    setDecks(loadedDecks);
    setInstalledDeckIds(installedIds);
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('bx_gemini_key', key);
  };

  const handleGenerateWithAI = async () => {
    if (!apiKey) return alert('Пожалуйста, введите ваш API-ключ Gemini');
    if (!aiPrompt.trim()) return alert('Введите тему для создания словаря');

    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
            const systemInstruction = `
        Ты — профессиональный генератор учебных материалов. Создай колоду учебных карточек на тему: "${aiPrompt}".
        Ты должен вернуть СТРОГО валидный JSON-объект без какого-либо окружающего текста, вступлений или разметки markdown (БЕЗ \`\`\`json).
        
        Структура JSON должна строго соответствовать этому шаблону:
        {
          "id": "ai_deck_${Date.now()}",
          "title": "Понятное название темы",
          "category": "custom",
          "categoryLabel": "Создано ИИ",
          "cardCount": 10,
          "difficulty": "Средний",
          "description": "Краткое описание набора",
          "cards": [
            {
              "id": "c1", 
              "front": "Слово/Формула/Термин", 
              "back": "Значение/Перевод", 
                            "hint": "Живое предложение-пример на изучаемом языке с переводом в скобках. Пример для Sachkunde 34a: Notwehr ist die Verteidigung (Необходимая оборона — это защита)"

            }
          ]
        }
        Сделай ровно 10 качественных карточек. В поле hint ОБЯЗАТЕЛЬНО пиши интересное, контекстное предложение с переводом.
      `;


      const response = await model.generateContent(systemInstruction);
      const responseText = response.response.text()?.trim() || '';
      const generatedDeck: DictionaryDeck = JSON.parse(responseText);

      localStorage.setItem(`bx_meta_deck_${generatedDeck.id}`, JSON.stringify(generatedDeck));
      localStorage.setItem(`bx_cards_${generatedDeck.id}`, JSON.stringify(generatedDeck.cards));
      localStorage.setItem(`bx_installed_${generatedDeck.id}`, 'true');

      setDecks(prev => [generatedDeck, ...prev]);
      setInstalledDeckIds(prev => [...prev, generatedDeck.id]);
      setAiPrompt('');
      alert(`Колода "${generatedDeck.title}" успешно сгенерирована!`);

    } catch (error) {
      console.error("Ошибка генерации:", error);
      alert("Не удалось сгенерировать колоду. Проверьте API-ключ.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLearning = (deckId: string) => {
    const selectedDeck = decks.find(d => d.id === deckId);
    if (selectedDeck) {
      setActiveTrainingDeck(selectedDeck);
    }
  };

  const handleFinishTraining = (xpEarned: number, wordsCount: number) => {
    const newXP = userXP + xpEarned;
    const newLearned = totalLearned + wordsCount;
    
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('bx_last_study_date');
    let newStreak = streak;
    if (lastDate !== today) {
      newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('bx_user_streak', newStreak.toString());
      localStorage.setItem('bx_last_study_date', today);
    }

    setUserXP(newXP);
    setTotalLearned(newLearned);
    localStorage.setItem('bx_user_xp', newXP.toString());
    localStorage.setItem('bx_total_learned', newLearned.toString());

    setActiveTrainingDeck(null);
  };

  const filteredDecks = decks.filter(deck => {
    const matchesSearch = deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          deck.description.toLowerCase().includes(searchQuery.toLowerCase());
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
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-md shadow-indigo-600/20">
              U
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Ваш кабинет</div>
              <div className="text-sm font-bold text-slate-200">{userXP} XP • Уровень {Math.floor(userXP / 100) + 1}</div>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <div className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 font-bold uppercase">Дни</span>
              <span className="text-sm font-extrabold text-amber-500">🔥 {streak}</span>
            </div>
            <div className="bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
              <span className="block text-[10px] text-slate-500 font-bold uppercase">Слова</span>
              <span className="text-sm font-extrabold text-emerald-400">🎓 {totalLearned}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs">
          <span className="text-slate-500">Ключ ИИ:</span>
          <input
            type="password"
            placeholder="Вставьте API-ключ Gemini..."
            value={apiKey}
            onChange={(e) => handleSaveKey(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 focus:outline-none focus:border-indigo-500 w-44 font-mono text-[10px]"
          />
        </div>

        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
              ✨ ИИ Генератор колод
            </h2>
            <p className="text-slate-500 text-[11px]">Что вы хотите выучить сегодня?</p>
          </div>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Пример: 10 терминов Sachkunde 34a..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
                       <button
              onClick={handleGenerateWithAI}
              disabled={isLoading || !apiKey}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Сгенерировать колоду'}
            </button>
          </div>
        </div>

        {/* Шапка поиска фраз */}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Быстрый поиск колоды..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Все' },
              { id: 'basic', label: 'Базовые' },
              { id: 'custom', label: 'Создано ИИ' }
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

        {/* Вертикальный список колод (Удобно скроллить на смартфоне) */}
        <div className="space-y-3">
          {filteredDecks.map(deck => (
            <div key={deck.id} className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
              <div className="space-y-2">
                <div className="flex gap-1.5 text-[9px] uppercase font-bold tracking-wider">
                  <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">{deck.categoryLabel}</span>
                  <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded">{deck.difficulty}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">{deck.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed font-normal">{deck.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[11px]">
                <span className="text-slate-500 font-medium">{deck.cardCount} фраз</span>
                <button
                  onClick={() => handleStartLearning(deck.id)}
                  className="px-4 py-2 bg-slate-100 hover:bg-white text-slate-950 font-bold rounded-lg text-xs transition-all active:scale-95"
                >
                  Учить →
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

