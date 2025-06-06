/*************************************************************************
 * Sistema de Ranking para o Jogo da Memória em Mandarim
 * Implementação com Firebase Realtime Database
 * 
 * Funcionalidades:
 * - Verifica se a pontuação entra no Top 10 antes de pedir nickname.
 * - Exibe mensagem especial para quem entra no ranking.
 * - Valida nickname contra palavras ofensivas e duplicidade no Top 10.
 * - Salva nickname, pontuação e tempo no Firebase.
 * - Limita o ranking às 10 melhores pontuações.
 * - Exibe o ranking em um modal.
 * - Botão "Ver Ranking" funcional no menu inicial.
 *************************************************************************/

// Namespace para o sistema de ranking
const MemoryGameRanking = {
    // Referência para o nó de ranking no Firebase
    rankingRef: firebase.database().ref("ranking"),
    
    // Número máximo de entradas no ranking
    MAX_ENTRIES: 10,

    // Lista simples de palavras ofensivas (exemplo, pode ser expandida)
    OFFENSIVE_WORDS: ["palavra1", "palavra2", "ofensa", "inadequado"], // Adicionar palavras reais aqui
    
    /**
     * Inicializa o sistema de ranking
     */
    init: function() {
        this.setupEventListeners();
        this.checkFirebaseConnection();
    },

    /**
     * Verifica e loga o status da conexão com o Firebase
     */
    checkFirebaseConnection: function() {
        const connectedRef = firebase.database().ref(".info/connected");
        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                console.log("Ranking System: Conectado ao Firebase");
            } else {
                console.log("Ranking System: Desconectado do Firebase");
            }
        });
    },
    
    /**
     * Configura os event listeners necessários
     */
    setupEventListeners: function() {
        document.addEventListener("DOMContentLoaded", () => {
            this.addRankingButtonToMenu();
            if (typeof window.showVictoryMessage === "function") {
                const originalShowVictoryMessage = window.showVictoryMessage;
                window.showVictoryMessage = async () => {
                    originalShowVictoryMessage.apply(this, arguments);
                    await MemoryGameRanking.handleVictory(); 
                };
            } else {
                console.error("Ranking System: Função showVictoryMessage não encontrada.");
            }
        });
    },

    /**
     * Adiciona o botão "Ver Ranking" ao menu inicial
     */
    addRankingButtonToMenu: function() {
        const gameStart = document.getElementById("game-start");
        const startGameButton = document.getElementById("start-game-button");
        let rankingButton = document.getElementById("view-ranking-button");

        if (gameStart && startGameButton && !rankingButton) {
            rankingButton = document.createElement("button");
            rankingButton.id = "view-ranking-button";
            rankingButton.className = "ranking-button";
            rankingButton.textContent = "Ver Ranking";
            startGameButton.parentNode.insertBefore(rankingButton, startGameButton.nextSibling);
            console.log("Ranking System: Botão 'Ver Ranking' adicionado ao menu.");
        }
        
        // Garante que o listener esteja sempre presente, mesmo que o botão já exista
        if (rankingButton) {
             // Remove listener antigo para evitar duplicação
             rankingButton.removeEventListener("click", this.showRankingBound);
             this.showRankingBound = this.showRanking.bind(this); // Cria/atualiza a referência ligada
             rankingButton.addEventListener("click", this.showRankingBound);
             console.log("Ranking System: Listener (re)adicionado ao botão 'Ver Ranking'.");
        }
    },

    /**
     * Lógica executada ao vencer o jogo
     */
    handleVictory: async function() {
        const victoryMessage = document.getElementById("victory-message");
        if (!victoryMessage) {
            console.error("Ranking System: Elemento victory-message não encontrado.");
            return;
        }

        const victoryTitle = victoryMessage.querySelector("h2");
        if (victoryTitle) {
            victoryTitle.textContent = "Parabéns!"; // Mensagem padrão
        }

        const oldNicknameForm = document.getElementById("nickname-form");
        if (oldNicknameForm) {
            oldNicknameForm.remove();
        }

        const score = typeof gameState !== "undefined" ? gameState.score : 0;
        
        try {
            const qualifiesForRanking = await this.checkIfScoreQualifiesForRanking(score);

            if (qualifiesForRanking) {
                console.log("Ranking System: Pontuação qualificada para o ranking.");
                if (victoryTitle) {
                    victoryTitle.textContent = "Parabéns! Você entrou no ranking!"; // Mensagem especial
                }
                this.displayNicknameForm(victoryMessage, score);
            } else {
                console.log("Ranking System: Pontuação não qualificada para o ranking.");
            }
        } catch (error) {
            console.error("Ranking System: Erro ao verificar qualificação para ranking:", error);
        }
    },
    
    /**
     * Verifica se a pontuação atual é suficiente para entrar no top 10
     */
    checkIfScoreQualifiesForRanking: async function(score) {
        console.log(`Ranking System: Verificando se a pontuação ${score} qualifica.`);
        try {
            const snapshot = await this.rankingRef.orderByChild("score").limitToLast(this.MAX_ENTRIES).once("value");
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push(childSnapshot.val());
            });

            if (scores.length < this.MAX_ENTRIES) {
                console.log("Ranking System: Qualifica (menos de 10 scores).");
                return true; 
            }
            
            let lowestTopScore = Infinity;
            scores.forEach(s => {
                if (s.score < lowestTopScore) {
                    lowestTopScore = s.score;
                }
            });
            
            const qualifies = score > lowestTopScore;
            console.log(`Ranking System: Menor pontuação no top 10: ${lowestTopScore}. Qualifica: ${qualifies}`);
            return qualifies;

        } catch (error) {
            console.error("Ranking System: Erro ao buscar scores para verificação:", error);
            return true; // Permite salvar em caso de erro
        }
    },

    /**
     * Verifica se um nickname contém palavras ofensivas
     * @param {string} nickname - Nickname a ser verificado
     * @returns {boolean} - True se for ofensivo, false caso contrário
     */
    isNicknameOffensive: function(nickname) {
        const lowerCaseNickname = nickname.toLowerCase();
        return this.OFFENSIVE_WORDS.some(word => lowerCaseNickname.includes(word.toLowerCase()));
    },

    /**
     * Verifica se um nickname já existe no Top 10 (case-insensitive)
     * @param {string} nickname - Nickname a ser verificado
     * @returns {Promise<boolean>} - Promessa que resolve para true se o nickname já existir, false caso contrário
     */
    isNicknameDuplicateInTop10: async function(nickname) {
        console.log(`Ranking System: Verificando duplicidade para ${nickname}`);
        try {
            const snapshot = await this.rankingRef.orderByChild("score").limitToLast(this.MAX_ENTRIES).once("value");
            let isDuplicate = false;
            const lowerCaseNickname = nickname.toLowerCase();
            snapshot.forEach((childSnapshot) => {
                const existingNickname = childSnapshot.val().nickname;
                if (existingNickname && existingNickname.toLowerCase() === lowerCaseNickname) {
                    isDuplicate = true;
                    return true; // Para o forEach
                }
            });
            console.log(`Ranking System: Nickname ${nickname} é duplicado? ${isDuplicate}`);
            return isDuplicate;
        } catch (error) {
            console.error("Ranking System: Erro ao verificar duplicidade de nickname:", error);
            return false; // Assume que não é duplicado em caso de erro
        }
    },

    /**
     * Cria e exibe o formulário para inserção do nickname
     */
    displayNicknameForm: function(parentElement, score) {
        const nicknameForm = document.createElement("div");
        nicknameForm.id = "nickname-form";
        nicknameForm.className = "nickname-form";

        nicknameForm.innerHTML = `
            <p>Digite seu nickname para salvar no ranking:</p>
            <div class="nickname-input-container">
                <input type="text" id="nickname-input" maxlength="15" placeholder="Seu nickname (max 15)">
                <button id="save-score-button" class="save-score-button">Salvar</button>
            </div>
            <button id="skip-ranking-button" class="skip-ranking-button">Pular</button>
        `;

        parentElement.appendChild(nicknameForm);

        const saveButton = document.getElementById("save-score-button");
        const skipButton = document.getElementById("skip-ranking-button");
        const nicknameInput = document.getElementById("nickname-input");

        saveButton.addEventListener("click", async () => {
            const nickname = nicknameInput.value.trim();
            
            if (!nickname) {
                alert("Por favor, digite um nickname.");
                return;
            }

            // 1. Verificar se é ofensivo
            if (this.isNicknameOffensive(nickname)) {
                alert("Este nickname não é permitido. Por favor, escolha outro.");
                return;
            }

            // 2. Verificar se é duplicado no Top 10
            try {
                const isDuplicate = await this.isNicknameDuplicateInTop10(nickname);
                if (isDuplicate) {
                    alert("Este nickname já existe no Top 10. Por favor, escolha outro.");
                    return;
                }
            } catch (error) {
                // Erro já logado na função isNicknameDuplicateInTop10
                alert("Erro ao verificar o nickname. Tente novamente.");
                return;
            }

            // Se passou nas validações, salva o score
            this.saveScore(nickname, score);
            nicknameForm.remove(); 
        });

        skipButton.addEventListener("click", () => {
            nicknameForm.remove();
        });

        nicknameInput.focus();
    },
    
    /**
     * Salva a pontuação no ranking do Firebase (após validações)
     */
    saveScore: function(nickname, score) {
        console.log(`Ranking System: Salvando score ${score} para ${nickname}`);
        const newScoreRef = this.rankingRef.push();
        const time = typeof totalSeconds !== "undefined" ? totalSeconds : null;

        const scoreData = {
            nickname: nickname,
            score: score,
            time: time, 
            date: firebase.database.ServerValue.TIMESTAMP 
        };
        
        newScoreRef.set(scoreData)
            .then(() => {
                console.log("Ranking System: Pontuação salva com sucesso!");
                this.limitRankingEntries();
                // Opcional: Mostrar o ranking após salvar com sucesso
                // this.showRanking(); 
            })
            .catch((error) => {
                console.error("Ranking System: Erro ao salvar pontuação:", error);
                alert("Erro ao salvar sua pontuação. Tente novamente.");
            });
    },
    
    /**
     * Garante que apenas as MAX_ENTRIES melhores pontuações sejam mantidas
     */
    limitRankingEntries: function() {
        this.rankingRef.orderByChild("score").once("value")
            .then((snapshot) => {
                if (snapshot.numChildren() > this.MAX_ENTRIES) {
                    console.log("Ranking System: Limitando entradas do ranking...");
                    const scores = [];
                    snapshot.forEach((childSnapshot) => {
                        scores.push({ key: childSnapshot.key, ...childSnapshot.val() });
                    });
                    
                    scores.sort((a, b) => a.score - b.score); // Ordena crescente para pegar os piores
                    
                    const entriesToRemove = snapshot.numChildren() - this.MAX_ENTRIES;
                    
                    for (let i = 0; i < entriesToRemove && i < scores.length; i++) {
                        this.rankingRef.child(scores[i].key).remove()
                            .then(() => console.log(`Ranking System: Entrada ${scores[i].key} removida.`))
                            .catch((error) => console.error(`Ranking System: Erro ao remover entrada ${scores[i].key}:`, error));
                    }
                }
            })
            .catch((error) => {
                console.error("Ranking System: Erro ao limitar entradas do ranking:", error);
            });
    },
    
    /**
     * Exibe o modal com a tabela de ranking
     */
    showRanking: function() {
        console.log("Ranking System: Exibindo ranking...");
        const oldModal = document.getElementById("ranking-modal");
        if (oldModal) {
            oldModal.remove();
        }

        const rankingModal = document.createElement("div");
        rankingModal.id = "ranking-modal";
        rankingModal.className = "ranking-modal";
        
        rankingModal.innerHTML = `
            <div class="ranking-content">
                <button id="close-ranking-button" class="close-ranking-button">&times;</button>
                <h2>🏆 Ranking Top 10 🏆</h2>
                <div id="ranking-table-container">
                    <div class="loading-spinner">Carregando ranking...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(rankingModal);

        const closeModal = () => rankingModal.remove();
        document.getElementById("close-ranking-button").addEventListener("click", closeModal);
        rankingModal.addEventListener("click", (event) => {
            if (event.target === rankingModal) {
                closeModal();
            }
        });

        this.fetchAndDisplayScores(document.getElementById("ranking-table-container"));
    },

    /**
     * Busca as pontuações no Firebase e atualiza a tabela no modal
     */
    fetchAndDisplayScores: function(container) {
        this.rankingRef.orderByChild("score").limitToLast(this.MAX_ENTRIES).once("value")
            .then((snapshot) => {
                const scores = [];
                snapshot.forEach((childSnapshot) => {
                    scores.push(childSnapshot.val());
                });
                
                scores.sort((a, b) => b.score - a.score);
                
                const formatTime = (seconds) => {
                    if (typeof seconds !== 'number') return '--:--';
                    const mins = Math.floor(seconds / 60);
                    const secs = seconds % 60;
                    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                };
                
                let tableHTML = `
                    <table class="ranking-table">
                        <thead>
                            <tr>
                                <th>Pos.</th>
                                <th>Nickname</th>
                                <th>Pontuação</th>
                                <th>Tempo</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                if (scores.length > 0) {
                    scores.forEach((entry, index) => {
                        tableHTML += `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${entry.nickname ? entry.nickname.substring(0, 15) : '??'}</td>
                                <td>${entry.score ?? 0}</td>
                                <td>${formatTime(entry.time)}</td>
                            </tr>
                        `;
                    });
                } else {
                    tableHTML += '<tr><td colspan="4">Nenhuma pontuação registrada ainda. Jogue para entrar no ranking!</td></tr>';
                }

                tableHTML += `
                        </tbody>
                    </table>
                `;
                
                container.innerHTML = tableHTML;
            })
            .catch((error) => {
                console.error("Ranking System: Erro ao buscar ranking:", error);
                container.innerHTML = `<p class="error-message">Erro ao carregar o ranking. Verifique sua conexão ou tente novamente.</p>`;
            });
    }
};

// Inicializa o sistema de ranking
MemoryGameRanking.init();

