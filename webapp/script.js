// Инициализация Telegram Mini App
window.Telegram?.WebApp?.ready();
const tg = window.Telegram?.WebApp;

document.addEventListener('DOMContentLoaded', function () {
  // Настройки игры
  const ROWS = 5;
  const COLS = 5;
  const MAX_MINES = 7;
  
  // Основные элементы
  const cellsBoard = document.querySelector('.cells-board');
  const trapsAmountElement = document.getElementById('trapsAmount');
  const prevPresetBtn = document.getElementById('prev_preset_btn');
  const nextPresetBtn = document.getElementById('next_preset_btn');
  const safeSignalBtn = document.getElementById('safeSignalBtn');
  const resultModal = document.getElementById('resultModal');
  const resultTitle = document.getElementById('result-title');
  const resultMessage = document.getElementById('result-message');
  const playAgainBtn = document.getElementById('playAgainBtn');
  const minesLeftDisplay = document.getElementById('minesLeft');
  const scoreDisplay = document.getElementById('scoreDisplay');
  
  // Соответствие количества мин к количеству показываемых полей
  const trapsToCellsOpenMapping = {
    1: 10,
    3: 5,
    5: 4,
    7: 3
  };
  
  // Состояние игры
  let gameState = {
    minesCount: 1,
    cells: [],
    revealed: 0,
    firstClick: true,
    gameOver: false,
    minesPlaced: false,
    score: 0,
    signalUsed: false
  };
  
  // Сохраняем оригинальное состояние доски
  let originalState = cellsBoard.innerHTML;
  
  // Получаем данные из URL
  const params = new URLSearchParams(window.location.search);
  const botName = params.get('botName') || 'MINES ABYZ';
  const language = params.get('language') || 'ru';
  
  // Устанавливаем имя бота
  const botNameElement = document.getElementById('botName');
  if (botNameElement) {
    botNameElement.textContent = botName;
    botNameElement.style.display = 'block';
  }
  
  // Функция скрытия прелоадера
  function hidePreloader() {
    const preloader = document.querySelector('.preloader');
    if (preloader) {
      preloader.style.opacity = '0';
      setTimeout(() => {
        preloader.style.display = 'none';
        document.body.classList.add('fade-in');
        // Анимируем появление фоновых элементов
        animateBgElements();
        // Запускаем игру сразу
        initGame();
      }, 500);
    }
  }
  
  // Анимация появления фоновых элементов
  function animateBgElements() {
    const planets = document.querySelectorAll('.planet');
    const meteors = document.querySelectorAll('.meteor');
    const spaceStation = document.querySelector('.space-station');
    
    planets.forEach((planet, index) => {
      setTimeout(() => {
        planet.style.transition = 'opacity 1s ease';
        planet.style.opacity = '1';
      }, index * 300);
    });
    
    setTimeout(() => {
      spaceStation.style.transition = 'opacity 1s ease';
      spaceStation.style.opacity = '1';
    }, 800);
  }
  
  // Скрываем прелоадер через 2 секунды
  setTimeout(hidePreloader, 2000);
  
  // Опции количества мин
  const trapsOptions = [1, 3, 5, 7];
  let currentPresetIndex = 0;
  
  // Обновление отображения количества мин
  function updateTrapsAmount() {
    if (trapsAmountElement) {
      gameState.minesCount = trapsOptions[currentPresetIndex];
      trapsAmountElement.textContent = gameState.minesCount;
      minesLeftDisplay.textContent = gameState.minesCount;
      
      // Анимация изменения числа
      trapsAmountElement.classList.add('select-traps__traps_amount--animated');
      setTimeout(() => {
        trapsAmountElement.classList.remove('select-traps__traps_amount--animated');
      }, 300);
      
      // После изменения количества мин перезапускаем игру
      initGame();
    }
  }
  
  // Обработчики событий для кнопок изменения количества мин
  if (prevPresetBtn) {
    prevPresetBtn.addEventListener('click', function () {
      if (currentPresetIndex > 0) {
        currentPresetIndex--;
        updateTrapsAmount();
        
        // Добавляем анимацию кнопки
        this.classList.add('btn-clicked');
        setTimeout(() => this.classList.remove('btn-clicked'), 300);
      }
    });
  }
  
  if (nextPresetBtn) {
    nextPresetBtn.addEventListener('click', function () {
      if (currentPresetIndex < trapsOptions.length - 1) {
        currentPresetIndex++;
        updateTrapsAmount();
        
        // Добавляем анимацию кнопки
        this.classList.add('btn-clicked');
        setTimeout(() => this.classList.remove('btn-clicked'), 300);
      }
    });
  }
  
  // Инициализация отображения количества мин
  updateTrapsAmount();
  
  // Инициализация игрового поля
  function initGame() {
    // Сброс состояния игры
    gameState = {
      minesCount: trapsOptions[currentPresetIndex],
      cells: [],
      revealed: 0,
      firstClick: true,
      gameOver: false,
      minesPlaced: false,
      score: 0,
      signalUsed: false
    };
    
    // Обновляем счетчики
    minesLeftDisplay.textContent = gameState.minesCount;
    scoreDisplay.textContent = '0';
    
    // Очищаем доску и восстанавливаем оригинальное состояние
    cellsBoard.innerHTML = originalState;
    
    // Добавляем индексы к ячейкам и события клика
    const cells = cellsBoard.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
      cell.dataset.index = index;
      cell.addEventListener('click', handleCellClick);
      
      // Добавляем анимацию появления ячеек
      setTimeout(() => {
        cell.classList.add('cell-appear');
      }, index * 30);
      
      // Инициализируем массив ячеек
      gameState.cells[index] = {
        index: index,
        isMine: false,
        isRevealed: false,
        element: cell
      };
    });
    
    // Размещаем мины после инициализации ячеек
    placeMines();
    
    // Активируем кнопку сигнала
    safeSignalBtn.disabled = false;
  }
  
  // Размещение мин (сразу в начале игры)
  function placeMines() {
    const totalCells = ROWS * COLS;
    const mineCount = gameState.minesCount;
    
    // Создаем массив индексов всех ячеек
    let indices = Array.from({length: totalCells}, (_, i) => i);
    
    // Перемешиваем массив
    indices.sort(() => Math.random() - 0.5);
    
    // Помечаем первые mineCount ячеек как мины
    for (let i = 0; i < mineCount; i++) {
      if (i < indices.length) {
        gameState.cells[indices[i]].isMine = true;
      }
    }
    
    gameState.minesPlaced = true;
  }
  
  // Обработчик клика по ячейке
  function handleCellClick(event) {
    if (gameState.gameOver) return;
    
    const cell = event.currentTarget;
    const index = parseInt(cell.dataset.index);
    const cellData = gameState.cells[index];
    
    // Если ячейка уже открыта, ничего не делаем
    if (cellData.isRevealed) return;
    
    // Открываем ячейку
    revealCell(cellData);
    
    // Проверяем условия победы/поражения
    checkGameState();
  }
  
  // Открытие ячейки
  function revealCell(cellData) {
    const cell = cellData.element;
    
    // Помечаем ячейку как открытую
    cellData.isRevealed = true;
    gameState.revealed++;
    
    // Анимация исчезновения текущего содержимого
    cell.classList.add('cell-fade-out');
    
    setTimeout(() => {
      // Очищаем содержимое
      cell.innerHTML = '';
      
      // Если мина - показываем взрыв
      if (cellData.isMine) {
        showMine(cell);
        gameState.gameOver = true;
        
        // Показываем все остальные мины с задержкой
        setTimeout(revealAllMines, 500);
      } else {
        // Иначе показываем безопасную ячейку
        showSafe(cell);
        
        // Увеличиваем счет
        gameState.score += 10;
        scoreDisplay.textContent = gameState.score;
      }
      
      cell.classList.remove('cell-fade-out');
    }, 300);
  }
  
  // Показать мину
  function showMine(cell) {
    const mineIcon = document.createElement('div');
    mineIcon.className = 'mine-icon';
    mineIcon.textContent = '💣';
    mineIcon.style.opacity = '0';
    mineIcon.style.transform = 'scale(0)';
    
    // Создаем элемент взрыва
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    
    cell.appendChild(explosion);
    cell.appendChild(mineIcon);
    
    // Анимация взрыва
    setTimeout(() => {
      mineIcon.style.opacity = '1';
      mineIcon.style.transform = 'scale(1)';
      
      // Добавляем вибрацию (если доступно в Telegram)
      if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      }
    }, 100);
  }
  
  // Показать безопасную ячейку
  function showSafe(cell) {
    const safeIcon = document.createElement('div');
    safeIcon.className = 'safe-icon';
    safeIcon.textContent = '✓';
    safeIcon.style.opacity = '0';
    safeIcon.style.transform = 'scale(0)';
    
    cell.appendChild(safeIcon);
    
    // Анимация появления значка
    setTimeout(() => {
      safeIcon.style.opacity = '1';
      safeIcon.style.transform = 'scale(1)';
      
      // Добавляем вибрацию (если доступно в Telegram)
      if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
    }, 100);
  }
  
  // Показать звездочку (для сигнала)
  function showStar(cell, index) {
    // Очищаем содержимое ячейки сначала
    while (cell.firstChild) {
      cell.removeChild(cell.firstChild);
    }
    
    console.log('Создаю звезду для ячейки');
    
    // Создаем изображение звезды
    const newImg = document.createElement('img');
    newImg.setAttribute('width', '40');
    newImg.setAttribute('height', '40');
    newImg.style.opacity = '0';
    newImg.style.transform = 'scale(0) rotate(0deg)';
    
    // Путь к SVG
    newImg.src = 'img/stars.svg';
    newImg.classList.add('star-animation');
    
    // Добавляем обработчики событий для отладки
    newImg.addEventListener('load', function() {
      console.log('SVG звезда загружена успешно');
    });
    
    newImg.addEventListener('error', function(e) {
      console.error('Ошибка загрузки SVG звезды:', e);
      console.error('Путь к файлу:', this.src);
      
      // В случае ошибки загрузки SVG, показываем текстовую звезду
      this.style.display = 'none';
      const textStar = document.createElement('div');
      textStar.className = 'star-animation';
      textStar.textContent = '★';
      textStar.style.fontSize = '24px';
      textStar.style.color = 'gold';
      cell.appendChild(textStar);
      
      // Добавляем класс для анимации текстовой звезды
      setTimeout(() => {
        textStar.classList.add('fade-in');
      }, 100);
    });
    
    cell.appendChild(newImg);
    
    // Проверяем наличие элемента cell-glow и создаем его, если он отсутствует
    let cellGlow = cell.querySelector('.cell-glow');
    if (!cellGlow) {
      console.log('Создаю элемент cell-glow, так как он отсутствует');
      cellGlow = document.createElement('div');
      cellGlow.className = 'cell-glow';
      cell.appendChild(cellGlow);
    } else {
      console.log('Элемент cell-glow уже существует');
    }
    
    // Добавляем класс активной ячейки
    cell.classList.add('cell-active');
    
    // Добавляем мерцающий эффект к cell-glow
    setTimeout(() => {
      cellGlow.classList.add('pulsing');
    }, 500);
    
    // Принудительно добавляем класс fade-in к звезде через небольшую задержку
    setTimeout(() => {
      const starElem = cell.querySelector('.star-animation');
      if (starElem && !starElem.classList.contains('fade-in')) {
        console.log('Принудительно добавляю класс fade-in к звезде');
        starElem.classList.add('fade-in');
      }
    }, 100);
  }
  
  // Показать все мины
  function revealAllMines() {
    gameState.cells.forEach((cellData, index) => {
      if (cellData.isMine && !cellData.isRevealed) {
        const cell = cellData.element;
        
        // Анимация исчезновения текущего содержимого
        cell.classList.add('cell-fade-out');
        
        setTimeout(() => {
          cell.innerHTML = '';
          showMine(cell);
          cell.classList.remove('cell-fade-out');
        }, index * 50); // Задержка для последовательного появления
      }
    });
    
    // Отображаем модальное окно результатов
    setTimeout(showResults, 1000);
  }
  
  // Проверка состояния игры
  function checkGameState() {
    // Условие победы: открыты все ячейки, кроме мин
    const totalCells = ROWS * COLS;
    const winCondition = totalCells - gameState.minesCount === gameState.revealed;
    
    if (gameState.gameOver) {
      // Проигрыш - действия выполняются в revealAllMines
    } else if (winCondition) {
      gameState.gameOver = true;
      
      // Бонус за победу
      gameState.score += 50;
      scoreDisplay.textContent = gameState.score;
      
      // Отображаем все мины как найденные
      markAllMines();
      
      // Отображаем модальное окно результатов
      setTimeout(showResults, 1000);
    }
  }
  
  // Отметить все мины (при победе)
  function markAllMines() {
    gameState.cells.forEach((cellData, index) => {
      if (cellData.isMine && !cellData.isRevealed) {
        const cell = cellData.element;
        
        // Анимируем ячейку
        cell.classList.add('cell-found');
        
        setTimeout(() => {
          const flagIcon = document.createElement('div');
          flagIcon.className = 'flag-icon';
          flagIcon.textContent = '🚩';
          flagIcon.style.opacity = '0';
          flagIcon.style.transform = 'scale(0)';
          
          cell.innerHTML = '';
          cell.appendChild(flagIcon);
          
          // Анимация появления флага
          setTimeout(() => {
            flagIcon.style.opacity = '1';
            flagIcon.style.transform = 'scale(1)';
          }, 100);
        }, index * 50);
      }
    });
  }
  
  // Показать модальное окно результатов
  function showResults() {
    // Определяем текст в зависимости от результата
    if (gameState.gameOver && gameState.revealed <= gameState.minesCount) {
      // Проигрыш
      resultTitle.textContent = 'Игра окончена!';
      resultMessage.textContent = `Вы нашли ${gameState.revealed - 1} из ${ROWS * COLS - gameState.minesCount} безопасных ячеек. Ваш счет: ${gameState.score}`;
    } else {
      // Победа
      resultTitle.textContent = 'Победа!';
      resultMessage.textContent = `Вы нашли все безопасные ячейки! Ваш счет: ${gameState.score}`;
    }
    
    // Отображаем модальное окно
    resultModal.classList.remove('hidden');
    
    // Отправляем результат в Telegram (если доступно)
    if (tg && tg.sendData) {
      const result = {
        score: gameState.score,
        win: !gameState.gameOver || gameState.revealed > gameState.minesCount,
        mines: gameState.minesCount,
        revealed: gameState.revealed
      };
      
      tg.sendData(JSON.stringify(result));
    }
  }
  
  // Кнопка "Получить сигнал" - показывает звездочки на безопасных ячейках
  safeSignalBtn.addEventListener('click', function() {
    if (gameState.gameOver || gameState.signalUsed) return;
    
    // Находим все безопасные и нераскрытые ячейки
    const safeCells = gameState.cells.filter(cell => 
      !cell.isMine && !cell.isRevealed
    );
    
    if (safeCells.length === 0) return;
    
    console.log("Нажата кнопка получения сигнала");
    
    // Звуковой эффект при нажатии на кнопку (если есть в Telegram)
    if (tg && tg.HapticFeedback) {
      tg.HapticFeedback.notificationOccurred('warning');
    }
    
    // Определяем количество ячеек для подсветки в зависимости от количества мин
    const cellsToShow = trapsToCellsOpenMapping[gameState.minesCount] || 1;
    
    // Не позволяем показать больше ячеек, чем доступно
    const showCount = Math.min(cellsToShow, safeCells.length);
    
    console.log(`Показываю ${showCount} безопасных ячеек`);
    
    // Перемешиваем массив ячеек
    safeCells.sort(() => Math.random() - 0.5);
    
    // Отключаем кнопку и добавляем анимацию нажатия
    this.disabled = true;
    this.classList.add('btn-clicked');
    setTimeout(() => this.classList.remove('btn-clicked'), 300);
    
    // Показываем звездочки на выбранных ячейках с задержкой
    function showStarsSequentially(index) {
      if (index >= showCount) {
        // Отмечаем, что сигнал был использован после показа всех звезд
        gameState.signalUsed = true;
        console.log("Все звезды показаны");
        return;
      }
      
      const cellData = safeCells[index];
      const cellElement = cellData.element;
      
      console.log(`Показываю звездочку на ячейке #${cellData.index}`);
      
      // Добавляем подсветку ячейки перед анимацией
      cellElement.classList.add('cell-highlight');
      
      // Анимация исчезновения текущего содержимого
      setTimeout(() => {
        cellElement.classList.add('cell-fade-out');
        
        setTimeout(() => {
          // Добавляем звездочку и удаляем подсветку
          showStar(cellElement, index);
          cellElement.classList.remove('cell-fade-out');
          cellElement.classList.remove('cell-highlight');
          
          // Анимация появления звезды с небольшой задержкой
          setTimeout(() => {
            const starImg = cellElement.querySelector('.star-animation');
            if (starImg) {
              console.log("Добавляем класс анимации fade-in к звезде");
              starImg.classList.add('fade-in');
              
              // Добавляем тактильный отклик для каждой звезды
              if (tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
              }
            } else {
              console.error("Не найден элемент звезды в ячейке");
            }
            
            // Вызываем для следующей ячейки с задержкой
            setTimeout(() => {
              showStarsSequentially(index + 1);
            }, 250); // Задержка между появлением звездочек
          }, 150);
        }, 300); // Задержка анимации исчезновения
      }, 150); // Задержка перед началом анимации исчезновения
    }
    
    // Запускаем последовательное отображение
    showStarsSequentially(0);
  });
  
  // Обработчик кнопки "Играть снова"
  playAgainBtn.addEventListener('click', function() {
    resultModal.classList.add('hidden');
    initGame();
  });
  
  // Запуск игры при загрузке страницы происходит в hidePreloader()
  
  // Добавляем классы CSS для анимации кнопок при наведении
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      this.classList.add('btn-hover');
    });
    
    btn.addEventListener('mouseleave', function() {
      this.classList.remove('btn-hover');
    });
  });
});

// Добавляем класс стилизации в зависимости от темы Telegram (если доступно)
if (window.Telegram?.WebApp) {
  document.documentElement.dataset.theme = window.Telegram.WebApp.colorScheme;
}