import React, { useState, useEffect, useRef } from 'react';

// Types pour le jeu
interface Fraction {
  numerator: number;
  denominator: number;
}

interface Question {
  fraction1: Fraction;
  fraction2: Fraction;
  operation: '+' | '-';
  correctAnswer: Fraction;
  options: Fraction[];
}

interface MoleProps {
  position: number;
  fraction: Fraction;
  isCorrect: boolean;
  onClick: () => void;
  isVisible: boolean;
  animationState: 'none' | 'correct' | 'incorrect';
}

interface GameStats {
  score: number;
  currentQuestion: number;
  timeLeft: number;
}

// Utilitaires pour les fractions
const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

const simplifyFraction = (fraction: Fraction): Fraction => {
  const divisor = gcd(Math.abs(fraction.numerator), Math.abs(fraction.denominator));
  return {
    numerator: fraction.numerator / divisor,
    denominator: fraction.denominator / divisor
  };
};

const addFractions = (f1: Fraction, f2: Fraction): Fraction => {
  const numerator = f1.numerator * f2.denominator + f2.numerator * f1.denominator;
  const denominator = f1.denominator * f2.denominator;
  return simplifyFraction({ numerator, denominator });
};

const subtractFractions = (f1: Fraction, f2: Fraction): Fraction => {
  const numerator = f1.numerator * f2.denominator - f2.numerator * f1.denominator;
  const denominator = f1.denominator * f2.denominator;
  return simplifyFraction({ numerator, denominator });
};

const fractionToString = (fraction: Fraction): string => {
  return `${fraction.numerator}/${fraction.denominator}`;
};

const fractionsEqual = (f1: Fraction, f2: Fraction): boolean => {
  const s1 = simplifyFraction(f1);
  const s2 = simplifyFraction(f2);
  return s1.numerator === s2.numerator && s1.denominator === s2.denominator;
};

// Composant Taupe
const Mole: React.FC<MoleProps> = ({ position, fraction, isCorrect, onClick, isVisible, animationState }) => {
  const moleRef = useRef<HTMLDivElement>(null);

  const getPositionStyle = (pos: number) => {
    const row = Math.floor(pos / 3);
    const col = pos % 3;
    return {
      gridRow: row + 1,
      gridColumn: col + 1
    };
  };

  const getMoleColor = () => {
    if (animationState === 'correct') return '#4CAF50';
    if (animationState === 'incorrect') return '#F44336';
    return '#8B4513';
  };

  return (
    <div
      style={{
        ...getPositionStyle(position),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transform: isVisible ? 'translateY(0)' : 'translateY(100px)',
        transition: 'transform 0.3s ease-in-out',
        opacity: isVisible ? 1 : 0,
        animation: animationState !== 'none' ? `${animationState}Animation 0.5s ease-in-out` : undefined
      }}
    >
      {/* Trou de taupe */}
      <div
        style={{
          width: '80px',
          height: '40px',
          backgroundColor: '#654321',
          borderRadius: '50px',
          border: '3px solid #4a2c17',
          position: 'absolute',
          bottom: '10px',
          zIndex: 1
        }}
      />
      
      {/* Taupe */}
      <div
        ref={moleRef}
        onClick={onClick}
        style={{
          width: '60px',
          height: '60px',
          backgroundColor: getMoleColor(),
          borderRadius: '50%',
          border: '2px solid #5d2e00',
          cursor: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\' viewBox=\'0 0 32 32\'><rect x=\'12\' y=\'4\' width=\'8\' height=\'20\' fill=\'%23654321\'/><rect x=\'8\' y=\'20\' width=\'16\' height=\'8\' fill=\'%23654321\'/></svg>") 16 16, pointer',
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
        }}
      >
        {/* Yeux de la taupe */}
        <div style={{ position: 'absolute', top: '15px', left: '18px', width: '6px', height: '6px', backgroundColor: 'black', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', top: '15px', right: '18px', width: '6px', height: '6px', backgroundColor: 'black', borderRadius: '50%' }} />
        
        {/* Nez de la taupe */}
        <div style={{ position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)', width: '4px', height: '4px', backgroundColor: 'black', borderRadius: '50%' }} />
      </div>
      
      {/* Panneau avec la réponse */}
      <div
        style={{
          backgroundColor: 'white',
          color: 'black',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '2px solid #333',
          fontSize: '16px',
          fontWeight: 'bold',
          marginTop: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          zIndex: 3,
          minWidth: '50px',
          textAlign: 'center'
        }}
      >
        {fractionToString(fraction)}
      </div>
    </div>
  );
};

// Composant principal du jeu
export const FractionGame: React.FC = () => {
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [stats, setStats] = useState<GameStats>({ score: 0, currentQuestion: 1, timeLeft: 5 });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [molesVisible, setMolesVisible] = useState(false);
  const [selectedMole, setSelectedMole] = useState<number | null>(null);
  const [moleAnimations, setMoleAnimations] = useState<Array<'none' | 'correct' | 'incorrect'>>([]);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [showNextQuestion, setShowNextQuestion] = useState(false);

  // Générer une question aléatoire
  const generateQuestion = (): Question => {
    const denominators = [2, 3, 4, 5, 6, 8, 10, 12];
    const numerators = [1, 2, 3, 4, 5, 7, 9, 11];
    
    const fraction1: Fraction = {
      numerator: numerators[Math.floor(Math.random() * numerators.length)],
      denominator: denominators[Math.floor(Math.random() * denominators.length)]
    };
    
    const fraction2: Fraction = {
      numerator: numerators[Math.floor(Math.random() * numerators.length)],
      denominator: denominators[Math.floor(Math.random() * denominators.length)]
    };
    
    const operation = Math.random() > 0.5 ? '+' : '-';
    const correctAnswer = operation === '+' 
      ? addFractions(fraction1, fraction2)
      : subtractFractions(fraction1, fraction2);
    
    // Générer 3 réponses incorrectes
    const wrongAnswers: Fraction[] = [];
    while (wrongAnswers.length < 3) {
      const wrongFraction: Fraction = {
        numerator: Math.floor(Math.random() * 20) + 1,
        denominator: Math.floor(Math.random() * 15) + 1
      };
      
      if (!fractionsEqual(wrongFraction, correctAnswer) && 
          !wrongAnswers.some(w => fractionsEqual(w, wrongFraction))) {
        wrongAnswers.push(simplifyFraction(wrongFraction));
      }
    }
    
    // Mélanger les options
    const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
    
    return { fraction1, fraction2, operation, correctAnswer, options };
  };

  // Initialiser une nouvelle question
  const initializeQuestion = () => {
    const question = generateQuestion();
    setCurrentQuestion(question);
    setMolesVisible(false);
    setSelectedMole(null);
    setMoleAnimations(['none', 'none', 'none', 'none']);
    setQuestionAnswered(false);
    setShowNextQuestion(false);
    setStats(prev => ({ ...prev, timeLeft: 5 }));
    
    // Afficher les taupes après un petit délai
    setTimeout(() => {
      setMolesVisible(true);
    }, 500);
  };

  // Gérer la sélection d'une taupe
  const handleMoleClick = (moleIndex: number) => {
    if (questionAnswered || !currentQuestion) return;
    
    setSelectedMole(moleIndex);
    setQuestionAnswered(true);
    
    const selectedFraction = currentQuestion.options[moleIndex];
    const isCorrect = fractionsEqual(selectedFraction, currentQuestion.correctAnswer);
    
    // Jouer un son (simulation)
    if (isCorrect) {
      console.log('🎉 Son de succès !');
    } else {
      console.log('❌ Son d\'échec !');
    }
    
    // Mettre à jour les animations
    const newAnimations = ['none', 'none', 'none', 'none'];
    newAnimations[moleIndex] = isCorrect ? 'correct' : 'incorrect';
    setMoleAnimations(newAnimations);
    
    // Mettre à jour le score
    const scoreChange = isCorrect ? 3 : -1;
    setStats(prev => ({ 
      ...prev, 
      score: Math.max(0, prev.score + scoreChange)
    }));
    
    // Passer à la question suivante après un délai
    setTimeout(() => {
      nextQuestion();
    }, 1500);
  };

  // Passer à la question suivante
  const nextQuestion = () => {
    if (stats.currentQuestion >= 10) {
      setGameState('finished');
      // Envoyer l'événement de completion
      window.postMessage({ 
        type: 'BLOCK_COMPLETION', 
        blockId: 'fraction-mole-game', 
        completed: true,
        score: stats.score,
        maxScore: 30
      }, '*');
      window.parent.postMessage({ 
        type: 'BLOCK_COMPLETION', 
        blockId: 'fraction-mole-game', 
        completed: true,
        score: stats.score,
        maxScore: 30
      }, '*');
    } else {
      setStats(prev => ({ ...prev, currentQuestion: prev.currentQuestion + 1 }));
      setMolesVisible(false);
      setTimeout(() => {
        initializeQuestion();
      }, 500);
    }
  };

  // Timer effect
  useEffect(() => {
    if (gameState === 'finished' || questionAnswered) return;
    
    const timer = setInterval(() => {
      setStats(prev => {
        if (prev.timeLeft <= 1) {
          // Temps écoulé, passer à la question suivante
          setTimeout(() => {
            nextQuestion();
          }, 100);
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameState, questionAnswered, stats.currentQuestion]);

  // Initialiser la première question
  useEffect(() => {
    initializeQuestion();
  }, []);

  // Obtenir le message de félicitations
  const getCongratulationsMessage = () => {
    const percentage = (stats.score / 30) * 100;
    if (percentage >= 90) return "🏆 Excellent ! Tu es un champion des fractions !";
    if (percentage >= 70) return "🎉 Très bien ! Tu maîtrises bien les fractions !";
    if (percentage >= 50) return "👍 Pas mal ! Continue à t'entraîner !";
    return "💪 Il faut encore s'entraîner, mais tu y arriveras !";
  };

  const restartGame = () => {
    setGameState('playing');
    setStats({ score: 0, currentQuestion: 1, timeLeft: 5 });
    initializeQuestion();
  };

  if (gameState === 'finished') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: 'Arial, sans-serif',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>🎯 Jeu Terminé !</h1>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '30px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '15px' }}>
            Score Final: {stats.score}/30
          </h2>
          <p style={{ fontSize: '1.5rem', marginBottom: '30px' }}>
            {getCongratulationsMessage()}
          </p>
          <button
            onClick={restartGame}
            style={{
              padding: '15px 30px',
              fontSize: '1.2rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            🔄 Rejouer
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div>Chargement...</div>;
  }

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* En-tête avec les statistiques */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        background: 'rgba(255,255,255,0.9)',
        padding: '15px 30px',
        borderRadius: '15px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          Question {stats.currentQuestion}/10
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          Score: {stats.score}
        </div>
        <div style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'bold',
          color: stats.timeLeft <= 2 ? '#ff4444' : '#333'
        }}>
          ⏰ {stats.timeLeft}s
        </div>
      </div>

      {/* Question */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        background: 'rgba(255,255,255,0.9)',
        padding: '20px',
        borderRadius: '15px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          margin: '0',
          color: '#333'
        }}>
          {fractionToString(currentQuestion.fraction1)} {currentQuestion.operation} {fractionToString(currentQuestion.fraction2)} = ?
        </h2>
      </div>

      {/* Grille de jeu 3x3 */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gap: '20px',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Cases vides pour créer le motif de damier */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <div
            key={index}
            style={{
              backgroundColor: (Math.floor(index / 3) + index) % 2 === 0 ? '#90EE90' : '#87CEEB',
              borderRadius: '15px',
              border: '2px solid #fff',
              position: 'relative',
              minHeight: '120px'
            }}
          >
            {/* Afficher les taupes seulement dans 4 cases aléatoirement positionnées */}
            {index < 4 && currentQuestion && (
              <Mole
                position={index}
                fraction={currentQuestion.options[index]}
                isCorrect={fractionsEqual(currentQuestion.options[index], currentQuestion.correctAnswer)}
                onClick={() => handleMoleClick(index)}
                isVisible={molesVisible}
                animationState={moleAnimations[index]}
              />
            )}
          </div>
        ))}
      </div>

      {/* Styles CSS pour les animations */}
      <style>
        {`
          @keyframes correctAnimation {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); background-color: #4CAF50; }
            100% { transform: scale(1); }
          }
          
          @keyframes incorrectAnimation {
            0% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.1) rotate(-5deg); background-color: #F44336; }
            75% { transform: scale(1.1) rotate(5deg); background-color: #F44336; }
            100% { transform: scale(1) rotate(0deg); }
          }
        `}
      </style>
    </div>
  );
};