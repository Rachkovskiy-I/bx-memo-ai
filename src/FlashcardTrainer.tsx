import React, { useState } from 'react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

interface TrainerProps {
  deckTitle: string;
  cards: Flashcard[];
  onClose: () => void;
  onFinish: (xpEarned: number, wordsCount: number) => void;
}

export const FlashcardTrainer: React.FC<TrainerProps> = ({ deckTitle, cards, onClose, onFinish }) => {
  const [queue, setQueue] = useState<Flashcard[]>([...cards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [scoreCorrect, setScoreCorrect] = useState(0);
  const [, setScoreWrong] = useState(0);

  const currentCard = queue[currentIndex];

  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setScoreCorrect(prev => prev + 1);
    } else {
      setScoreWrong(prev => prev + 1);
      setQueue(prevQueue => [...prevQueue, currentCard]);
    }
    setIsFlipped(false);
    setCurrentIndex(prevIndex => prevIndex + 1);
  };

  const isFinished = currentIndex >= queue.length;

  if (isFinished) {
    const xpEarned = scoreCorrect * 10;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-5 shadow-2xl">
          <h2 className="text-xl font-extrabold text-emerald-400">🎉 Сессия завершена!</h2>
          <p className="text-slate-400 text-xs font-normal">Вы успешно проработали все карточки.</p>
          
          <div className="bg-gradient-to-r from-indigo-950 to-slate-950 p-4 rounded-xl border border-indigo-900/30 text-center">
            <span className="text-2xl font-black text-indigo-400 block">+ {xpEarned} XP</span>
            <span className="text-[10px] text-indigo-300 uppercase font-bold tracking-wider">Получено опыта</span>
          </div>

          <button
            onClick={() => onFinish(xpEarned, cards.length)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all"
          >
            Сохранить прогресс и выйти
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 flex flex-col justify-between max-w-md mx-auto">
      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
        <div className="max-w-[70%]">
          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 block">Заучивание</span>
          <h1 className="text-xs font-bold text-slate-200 truncate">{deckTitle}</h1>
        </div>
        <button onClick={onClose} className="text-[11px] text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg bg-slate-900">
          Выйти
        </button>
      </div>

      <div className="my-auto py-6">
        <div onClick={() => setIsFlipped(!isFlipped)} className="w-full min-h-[240px] bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between cursor-pointer">
          <div className="text-center">
            {currentCard.hint && <span className="text-[10px] bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800 text-slate-500 font-semibold">{currentCard.hint}</span>}
          </div>
          <div className="text-center py-4 space-y-3">
            <div className="text-xl font-bold tracking-wide text-slate-100">{currentCard.front}</div>
            {isFlipped ? <div className="text-base font-bold text-indigo-300 pt-3 border-t border-slate-800/40">{currentCard.back}</div> : <div className="text-[11px] text-slate-500 italic pt-3">Тапните для ответа...</div>}
          </div>
          <div className="text-center text-[9px] text-slate-600 font-bold uppercase tracking-wider">Карточка {currentIndex + 1} из {queue.length}</div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-900 pt-4">
        <div className="flex gap-3">
          <button onClick={() => handleAnswer(false)} disabled={!isFlipped} className="flex-1 py-3 bg-slate-900 border border-slate-800 text-rose-400 font-bold rounded-xl text-xs disabled:opacity-20">❌ Ошибка</button>
          <button onClick={() => handleAnswer(true)} disabled={!isFlipped} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs disabled:opacity-20">✅ Знаю</button>
        </div>
      </div>
    </div>
  );
};
