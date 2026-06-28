import React, { useState } from 'react';

// Описываем структуру карточки, которую принимает этот экран
interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
}

// Параметры, которые главный экран передает в этот тренажер
interface TrainerProps {
  deckTitle: string;         // Название колоды, которую мы учим
  cards: Flashcard[];        // Массив карточек этой колоды
  onClose: () => void;       // Функция, чтобы вернуться обратно в каталог
}

export const FlashcardTrainer: React.FC<TrainerProps> = ({ deckTitle, cards, onClose }) => {
  
  // --- ХУКИ СОСТОЯНИЯ (Управление памятью экрана) ---
  
  // Создаем динамическую очередь карточек. Изначально она равна базовому набору.
  const [queue, setQueue] = useState<Flashcard[]>([...cards]);
  
  // Индекс карточки, которую пользователь видит прямо сейчас (всегда начинаем с 0)
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Показываем лицевую сторону (false) или оборотную с ответом (true)
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Компактные счетчики для статистики сессии внизу экрана
  const [scoreCorrect, setScoreCorrect] = useState(0);
  const [scoreWrong, setScoreWrong] = useState(0);

  // Извлекаем текущую карточку из очереди на основе индекса
  const currentCard = queue[currentIndex];

  // --- ЛОГИКА ОБРАБОТКИ ОТВЕТОВ ПОЛЬЗОВАТЕЛЯ ---
  
  const handleAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      // Если пользователь ответил "Знаю", увеличиваем счетчик правильных ответов
      setScoreCorrect(prev => prev + 1);
    } else {
      // Магия BX Memo: Если "Ошибка", берем текущую карточку и пушим её в конец очереди!
      setScoreWrong(prev => prev + 1);
      setQueue(prevQueue => [...prevQueue, currentCard]);
    }

    // Готовимся к следующей карточке: сбрасываем переворот (скрываем ответ)
    setIsFlipped(false);

    // Сдвигаем индекс вперед на следующую карточку
    setCurrentIndex(prevIndex => prevIndex + 1);
  };

  // Проверяем, закончилась ли тренировка (если индекс догнал размер динамической очереди)
  const isFinished = currentIndex >= queue.length;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6">
          <h2 className="text-2xl font-bold text-emerald-400">🎉 Сессия завершена!</h2>
          <p className="text-slate-400 text-sm">Вы успешно проработали все карточки и исправили ошибки.</p>
          
          <div className="grid grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="block text-slate-500">Знаю сразу:</span>
              <span className="text-lg font-bold text-slate-200">{scoreCorrect}</span>
            </div>
            <div>
              <span className="block text-slate-500">Повторений:</span>
              <span className="text-lg font-bold text-slate-400">{scoreWrong}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all"
          >
            Вернуться в библиотеку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col justify-between">
      
      {/* Шапка тренажера */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Идет заучивание</span>
          <h1 className="text-base font-semibold text-slate-200 line-clamp-1">{deckTitle}</h1>
        </div>
        <button 
          onClick={onClose}
          className="text-xs text-slate-500 hover:text-slate-300 border border-slate-800 px-3 py-1.5 rounded-lg bg-slate-900"
        >
          Выйти
        </button>
      </div>

      {/* Центральная зона: Карточка запоминания */}
      <div className="max-w-xl w-full mx-auto my-auto py-8">
        <div 
          onClick={() => setIsFlipped(!isFlipped)}
          className={`w-full min-h-[260px] bg-slate-900 border ${isFlipped ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-slate-800'} rounded-2xl p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-slate-700 shadow-xl`}
        >
          {/* Верхняя часть карточки (Подсказка) */}
          <div className="text-center">
            {currentCard.hint && (
              <span className="text-xs bg-slate-950 px-3 py-1 rounded-full border border-slate-800/60 text-slate-500 font-medium">
                {currentCard.hint}
              </span>
            )}
          </div>

          {/* Центр карточки (Текст) */}
          <div className="text-center py-6 space-y-4">
            <div className="text-2xl font-bold tracking-wide text-slate-100">
              {currentCard.front}
            </div>
            
            {isFlipped ? (
              <div className="text-lg font-medium text-indigo-300 pt-4 border-t border-slate-800/40 animate-fadeIn">
                {currentCard.back}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic pt-4">
                Кликните по карточке, чтобы увидеть ответ...
              </div>
            )}
          </div>

          {/* Прогресс внутри карточки */}
          <div className="text-center text-[10px] text-slate-600 font-medium uppercase tracking-wider">
            Карточка {currentIndex + 1} из {queue.length}
          </div>
        </div>
      </div>

      {/* Нижняя зона: Бинарные кнопки оценки (Появляются только когда карточка перевернута) */}
      <div className="max-w-xl w-full mx-auto space-y-4 border-t border-slate-900 pt-6">
        <div className="flex gap-4">
          <button
            onClick={() => handleAnswer(false)}
            disabled={!isFlipped}
            className="flex-1 py-3.5 bg-slate-900 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/50 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:border-slate-800 text-rose-400 font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            ❌ Ошибка
          </button>
          <button
            onClick={() => handleAnswer(true)}
            disabled={!isFlipped}
            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:border-slate-800 disabled:text-slate-600 disabled:opacity-30 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            ✅ Знаю
          </button>
        </div>

        {/* Компактные счетчики сессии */}
        <div className="flex justify-between text-xs text-slate-500 px-1 font-medium">
          <span>Правильно сразу: <span className="text-emerald-500">{scoreCorrect}</span></span>
          <span>Осталось в очереди: <span className="text-indigo-400">{queue.length - currentIndex}</span></span>
        </div>
      </div>

    </div>
  );
};
