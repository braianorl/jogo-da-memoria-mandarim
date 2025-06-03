/**
 * Jogo da Memória em Mandarim - Versão Avançada
 * Implementação em JavaScript puro com categorias, níveis e pontuação
 */

// Estado global do jogo
const gameState = {
    // Configurações do jogo
    selectedCategory: 'todos',
    selectedDifficulty: 'normal',
    
    // Estado do jogo
    cards: [],
    flippedCards: [],
    isChecking: false,
    usedPictogramIds: [],
    matchedPairs: 0,
    totalPairs: 6,
    attempts: 0,
    isMuted: false,
    
    // Sistema de pontuação
    score: 0,
    multiplier: 2, // Padrão para dificuldade normal
};

let timerInterval;
let totalSeconds = 0;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function startTimer() {
  totalSeconds = 0;
  clearInterval(timerInterval); // Garante que não tenha outro rodando
  timerInterval = setInterval(() => {
    totalSeconds++;
    document.getElementById('timer-display').textContent = formatTime(totalSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}


// Elementos do DOM
const elements = {
    // Telas
    gameStart: document.getElementById('game-start'),
    gameScreen: document.getElementById('game-screen'),
    
    // Elementos da tela inicial
    categoryButtons: document.querySelectorAll('.category-button'),
    difficultyButtons: document.querySelectorAll('.difficulty-button'),
    startGameButton: document.getElementById('start-game-button'),
    
    // Elementos da tela de jogo
    gameGrid: document.getElementById('game-grid'),
    matchedPairsCounter: document.getElementById('matched-pairs'),
    totalPairsCounter: document.getElementById('total-pairs'),
    attemptsCounter: document.getElementById('attempts'),
    scoreDisplay: document.getElementById('score-display'),
    categoryDisplay: document.getElementById('category-display'),
    difficultyDisplay: document.getElementById('difficulty-display'),
    muteButton: document.getElementById('mute-button'),
    newGameButton: document.getElementById('new-game-button'),
    backButton: document.getElementById('back-button'),
    
    // Elementos da mensagem de vitória
    victoryMessage: document.getElementById('victory-message'),
    finalAttempts: document.getElementById('final-attempts'),
    finalScore: document.getElementById('final-score'),
    playAgainButton: document.getElementById('play-again-button'),
    menuButton: document.getElementById('menu-button')
};

/**
 * Filtra pictogramas por categoria
 * @param {string} category Categoria a ser filtrada
 * @returns {Array} Array de pictogramas filtrados
 */
function getPictogramsByCategory(category) {
    if (category === 'todos') {
        return pictogramsBank;
    }
    return pictogramsBank.filter(p => p.category === category);
}

/**
 * Seleciona pictogramas aleatórios do banco
 * @param {number} count Número de pictogramas a serem selecionados
 * @param {Array} excludeIds IDs de pictogramas a serem excluídos da seleção
 * @returns {Array} Array com os pictogramas selecionados
 */
function getRandomPictograms(count, excludeIds = []) {
    // Filtra por categoria atual
    const categoryPictograms = getPictogramsByCategory(gameState.selectedCategory);
    
    // Filtra o banco para remover os pictogramas excluídos
    const availablePictograms = categoryPictograms.filter(p => !excludeIds.includes(p.id));
    
    // Se não houver pictogramas suficientes, use todos disponíveis
    if (availablePictograms.length < count) {
        console.warn('Não há pictogramas suficientes na categoria. Usando todos disponíveis.');
        return shuffleArray([...availablePictograms]);
    }
    
    // Embaralha o array de pictogramas disponíveis
    const shuffled = shuffleArray([...availablePictograms]);
    
    // Retorna o número solicitado de pictogramas
    return shuffled.slice(0, count);
}

/**
 * Embaralha um array (algoritmo Fisher-Yates)
 * @param {Array} array Array a ser embaralhado
 * @returns {Array} Array embaralhado
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Obtém o número de pares com base na dificuldade
 * @returns {number} Número de pares para o jogo
 */
function getNumberOfPairsByDifficulty() {
    switch (gameState.selectedDifficulty) {
        case 'easy': return 4; // 8 cartas (grid 2x4)
        case 'normal': return 6; // 12 cartas (grid 3x4)
        case 'hard': return 8; // 16 cartas (grid 4x4)
        default: return 6;
    }
}
/**
 * Obtém o multiplicador de pontuação com base na dificuldade
 * @returns {number} Multiplicador de pontuação
 */
function getScoreMultiplierByDifficulty() {
    switch (gameState.selectedDifficulty) {
        case 'easy': return 1;
        case 'normal': return 2;
        case 'hard': return 3;
        default: return 1;
    }
}

/**
 * Inicializa um novo jogo com pictogramas aleatórios
 */
function initializeGame() {
    // Limpa o grid de jogo
    elements.gameGrid.innerHTML = '';
    
    startTimer();
    // Reseta o estado do jogo
    gameState.cards = [];
    gameState.flippedCards = [];
    gameState.isChecking = false;
    gameState.matchedPairs = 0;
    gameState.attempts = 0;
    gameState.score = 0;
    
    // Define o multiplicador baseado na dificuldade
    gameState.multiplier = getScoreMultiplierByDifficulty();
    
    // Número de pares baseado na dificuldade
    const numberOfPairs = getNumberOfPairsByDifficulty();
    gameState.totalPairs = numberOfPairs;
    
    // Atualiza os contadores na interface
    elements.matchedPairsCounter.textContent = gameState.matchedPairs;
    elements.totalPairsCounter.textContent = gameState.totalPairs;
    elements.attemptsCounter.textContent = gameState.attempts;
    elements.scoreDisplay.textContent = gameState.score;
    
    // Atualiza informações de categoria e dificuldade
    elements.categoryDisplay.textContent = `Categoria: ${getCategoryDisplayName(gameState.selectedCategory)}`;
    elements.difficultyDisplay.textContent = `Dificuldade: ${getDifficultyDisplayName(gameState.selectedDifficulty)}`;
    
    // Ajusta o grid com base na dificuldade
    elements.gameGrid.className = `game-grid ${gameState.selectedDifficulty}`;
    
    // Esconde a mensagem de vitória se estiver visível
    elements.victoryMessage.classList.add('hidden');
    
    // Seleciona pictogramas aleatórios, excluindo os já usados recentemente
    const selectedPictograms = getRandomPictograms(numberOfPairs, gameState.usedPictogramIds);
    
    // Atualiza a lista de pictogramas usados
    gameState.usedPictogramIds = [
        ...gameState.usedPictogramIds,
        ...selectedPictograms.map(p => p.id)
    ].slice(-20); // Mantém apenas os últimos 20 IDs para evitar esgotar o banco
    
    // Cria pares de cartas com os pictogramas selecionados
    const cardPairs = [];
    selectedPictograms.forEach(pictogram => {
        // Cria duas cartas com o mesmo pictograma (um par)
        cardPairs.push(
            {
                id: `${pictogram.id}-1`,
                pictogram,
                isFlipped: false,
                isMatched: false
            },
            {
                id: `${pictogram.id}-2`,
                pictogram,
                isFlipped: false,
                isMatched: false
            }
        );
    });
    
    // Embaralha as cartas
    gameState.cards = shuffleArray([...cardPairs]);
    
    // Renderiza as cartas no grid
    renderCards();
}

/**
 * Renderiza as cartas no grid do jogo
 */
function renderCards() {
    gameState.cards.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.isFlipped ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''}`;
        cardElement.dataset.id = card.id;
        cardElement.dataset.index = index;
        
        cardElement.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-back-content">?</div>
                </div>
                <div class="card-back">
                    <div class="card-content">
                        <div class="character">${card.pictogram.character}</div>
                        <div class="pinyin">${card.pictogram.pinyin}</div>
                        <div class="meaning">${card.pictogram.meaning}</div>
                    </div>
                </div>
            </div>
        `;
        
        // Adiciona evento de clique
        cardElement.addEventListener('click', () => handleCardClick(card.id));
        
        // Adiciona a carta ao grid
        elements.gameGrid.appendChild(cardElement);
    });
}

/**
 * Manipula o clique em uma carta
 * @param {string} cardId ID da carta clicada
 */
function handleCardClick(cardId) {
    // Ignora cliques durante verificação ou se já há 2 cartas viradas
    if (gameState.isChecking || gameState.flippedCards.length >= 2) return;
    
    // Encontra a carta clicada no estado do jogo
    const cardIndex = gameState.cards.findIndex(card => card.id === cardId);
    const card = gameState.cards[cardIndex];
    
    // Ignora cliques em cartas já viradas ou pareadas
    if (!card || card.isFlipped || card.isMatched) return;
    
    // Atualiza o estado da carta para virada
    gameState.cards[cardIndex].isFlipped = true;
    
    // Atualiza a visualização da carta
    const cardElement = document.querySelector(`.card[data-id="${cardId}"]`);
    cardElement.classList.add('flipped');
    
    // Adiciona a carta à lista de cartas viradas
    gameState.flippedCards.push(cardId);
    
    // Simula o áudio (em uma implementação futura, aqui seria reproduzido o áudio real)
    playCardAudio(card.pictogram);
    
    // Verifica se há um par quando duas cartas são viradas
    if (gameState.flippedCards.length === 2) {
        checkForMatch();
    }
}

/**
 * Simula a reprodução de áudio para uma carta
 * @param {Object} pictogram Pictograma associado à carta
 */
function playCardAudio(pictogram) {
    // Em uma implementação futura, aqui seria reproduzido o áudio real
    // Por enquanto, apenas simulamos para manter a estrutura do código
    if (gameState.isMuted) {
        console.log('Áudio mudo');
    } else {
        console.log(`Reproduzindo áudio para: ${pictogram.character} (${pictogram.pinyin})`);
    }
}

/**
 * Verifica se as duas cartas viradas formam um par
 */
function checkForMatch() {
    gameState.isChecking = true;
    
    // Incrementa o contador de tentativas
    gameState.attempts++;
    elements.attemptsCounter.textContent = gameState.attempts;
    
    // Obtém as duas cartas viradas
    const [firstId, secondId] = gameState.flippedCards;
    const firstCardIndex = gameState.cards.findIndex(card => card.id === firstId);
    const secondCardIndex = gameState.cards.findIndex(card => card.id === secondId);
    
    const firstCard = gameState.cards[firstCardIndex];
    const secondCard = gameState.cards[secondCardIndex];
    
    // Verifica se formam um par
    const isMatch = firstCard.pictogram.id === secondCard.pictogram.id;
    
    if (isMatch) {
        // Se formam um par, marca as cartas como pareadas
        gameState.cards[firstCardIndex].isMatched = true;
        gameState.cards[secondCardIndex].isMatched = true;
        
        // Atualiza a visualização das cartas
        document.querySelector(`.card[data-id="${firstId}"]`).classList.add('matched');
        document.querySelector(`.card[data-id="${secondId}"]`).classList.add('matched');
        
        // Incrementa o contador de pares encontrados
        gameState.matchedPairs++;
        elements.matchedPairsCounter.textContent = gameState.matchedPairs;
        
        // Calcula pontos: base de 100 pontos por par, multiplicado pelo fator de dificuldade
        const basePoints = 100;
        // Bônus por rapidez (menos tentativas = mais pontos)
        const speedBonus = Math.max(250 - (gameState.attempts * 5), 0);
        // Bônus por velocidade (menos tempo = mais pontos)
        const timeBonus = Math.max(300 - (totalSeconds * 2), 0);
        // Pontuação total para este par
        const pointsEarned = (basePoints + speedBonus + timeBonus) * gameState.multiplier;
        
        // Adiciona ao score total
        gameState.score += pointsEarned;
        
        // Atualiza o display de pontuação
        elements.scoreDisplay.textContent = gameState.score;
        
        // Exibe animação de pontos
        showPointsAnimation(pointsEarned);
        
        // Limpa a lista de cartas viradas
        gameState.flippedCards = [];
        gameState.isChecking = false;
        
        // Verifica se o jogo foi concluído
        if (gameState.matchedPairs === gameState.totalPairs) {
            setTimeout(showVictoryMessage, 500);
            stopTimer();
        }
    } else {
        // Se não formam um par, vira as cartas de volta após um delay
        setTimeout(() => {
            // Atualiza o estado das cartas
            gameState.cards[firstCardIndex].isFlipped = false;
            gameState.cards[secondCardIndex].isFlipped = false;
            
            // Atualiza a visualização das cartas
            document.querySelector(`.card[data-id="${firstId}"]`).classList.remove('flipped');
            document.querySelector(`.card[data-id="${secondId}"]`).classList.remove('flipped');
            
            // Limpa a lista de cartas viradas
            gameState.flippedCards = [];
            gameState.isChecking = false;
        }, 1500); // Delay de 1.5 segundos conforme requisitos
    }
}

/**
 * Exibe animação de pontos ganhos
 * @param {number} points Pontos ganhos
 */
function showPointsAnimation(points) {
    // Cria um elemento para mostrar os pontos ganhos
    const pointsElement = document.createElement('div');
    pointsElement.className = 'points-animation';
    pointsElement.textContent = `+${points}`;
    
    // Adiciona ao DOM
    document.querySelector('.memory-game').appendChild(pointsElement);
    
    // Remove após a animação
    setTimeout(() => {
        pointsElement.remove();
    }, 1500);
}

// Classe para armazenar o tempo de término da partida
class GameEndTime {
    constructor() {
        this.endTime = null;
    }

    setEndTime(seconds) {
        this.endTime = seconds;
    }

    getEndTime() {
        return this.endTime;
    }
}

// Instância global para uso em outras partes do código
const gameEndTime = new GameEndTime();

/**
 * Exibe a mensagem de vitória
 */
function showVictoryMessage() {
    
   
    elements.finalScore.textContent = gameState.score;
    elements.victoryMessage.classList.remove('hidden');
    
    const speedBonus = Math.max(250 - (gameState.attempts * 5), 0);
    const timeBonus = Math.max(300 - (totalSeconds * 2), 0);

    const finalSpeedBonusElement = document.getElementById('final-speed-bonus');
    const finalTimeBonusElement = document.getElementById('final-time-bonus');

    if (finalSpeedBonusElement) {
        finalSpeedBonusElement.textContent = speedBonus * gameState.totalPairs * gameState.multiplier;
    }
    if (finalTimeBonusElement) {
        finalTimeBonusElement.textContent = timeBonus * gameState.totalPairs * gameState.multiplier;
    }
}

/**
 * Alterna o estado de mute do áudio
 */
function toggleMute() {
    gameState.isMuted = !gameState.isMuted;
    elements.muteButton.textContent = gameState.isMuted ? '🔇' : '🔊';
    elements.muteButton.setAttribute('aria-label', gameState.isMuted ? 'Ativar som' : 'Desativar som');
    elements.muteButton.classList.toggle('muted', gameState.isMuted);
}

/**
 * Seleciona uma categoria
 * @param {string} category Categoria selecionada
 */
function selectCategory(category) {
    // Remove a classe 'selected' de todos os botões de categoria
    elements.categoryButtons.forEach(button => {
        button.classList.remove('selected');
    });
    
    // Adiciona a classe 'selected' ao botão da categoria selecionada
    document.querySelector(`.category-button[data-category="${category}"]`).classList.add('selected');
    
    // Atualiza o estado do jogo
    gameState.selectedCategory = category;
}

/**
 * Seleciona uma dificuldade
 * @param {string} difficulty Dificuldade selecionada
 */
function selectDifficulty(difficulty) {
    // Remove a classe 'selected' de todos os botões de dificuldade
    elements.difficultyButtons.forEach(button => {
        button.classList.remove('selected');
    });
    
    // Adiciona a classe 'selected' ao botão da dificuldade selecionada
    document.querySelector(`.difficulty-button[data-difficulty="${difficulty}"]`).classList.add('selected');
    
    // Atualiza o estado do jogo
    gameState.selectedDifficulty = difficulty;
}

/**
 * Inicia o jogo com as configurações selecionadas
 */
function startGame() {
    // Esconde a tela inicial
    elements.gameStart.classList.add('hidden');
    
    // Mostra a tela do jogo
    elements.gameScreen.classList.remove('hidden');
    
    // Inicializa o jogo
    initializeGame();
}

/**
 * Volta para o menu principal
 */
function goToMainMenu() {
    // Esconde a tela do jogo
    elements.gameScreen.classList.add('hidden');
    
    // Mostra a tela inicial
    elements.gameStart.classList.remove('hidden');
}

/**
 * Obtém o nome de exibição da categoria
 * @param {string} category Código da categoria
 * @returns {string} Nome de exibição da categoria
 */
function getCategoryDisplayName(category) {
    const categoryNames = {
        'numeros': 'Números',
        'animais': 'Animais',
        'familia': 'Família',
        'natureza': 'Natureza',
        'basicos': 'Básicos',
        'todos': 'Todos'
    };
    
    return categoryNames[category] || 'Desconhecida';
}

/**
 * Obtém o nome de exibição da dificuldade
 * @param {string} difficulty Código da dificuldade
 * @returns {string} Nome de exibição da dificuldade
 */
function getDifficultyDisplayName(difficulty) {
    const difficultyNames = {
        'easy': 'Fácil',
        'normal': 'Normal',
        'hard': 'Difícil'
    };
    
    return difficultyNames[difficulty] || 'Desconhecida';
}

// Adiciona event listeners quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Seleciona a categoria padrão
    selectCategory('todos');
    
    // Seleciona a dificuldade padrão
    selectDifficulty('normal');
    
    // Event listeners para os botões de categoria
    elements.categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            selectCategory(category);
        });
    });
    
    // Event listeners para os botões de dificuldade
    elements.difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const difficulty = button.dataset.difficulty;
            selectDifficulty(difficulty);
        });
    });
    
    // Event listener para o botão de iniciar jogo
    elements.startGameButton.addEventListener('click', startGame);
    
    // Event listener para o botão de mute
    elements.muteButton.addEventListener('click', toggleMute);
    
    // Event listener para o botão de novo jogo
    elements.newGameButton.addEventListener('click', initializeGame);
    
    // Event listener para o botão de voltar ao menu
    elements.backButton.addEventListener('click', goToMainMenu);
    
    // Event listener para o botão de jogar novamente na mensagem de vitória
    elements.playAgainButton.addEventListener('click', initializeGame);
    
    // Event listener para o botão de menu na mensagem de vitória
    elements.menuButton.addEventListener('click', goToMainMenu);
});
