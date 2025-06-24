import React, { useState, useEffect, useRef } from 'react';

// Types pour le jeu
interface Fraction {
  numerator: number;
  denominator: number;
}

interface Question {
  fraction1?: Fraction;
  fraction2?: Fraction;
  operation: '+' | '-' | 'simplify';
  correctAnswer: Fraction;
  options: Fraction[];
  questionText: string;
  selectedHoles: number[]; // Indices des 4 trous sélectionnés (0-8)
}

interface MoleProps {
  holeIndex: number;
  fraction: Fraction;
  isCorrect: boolean;
  onClick: () => void;
  isVisible: boolean;
  animationState: 'none' | 'correct' | 'incorrect';
  timeLeft: number;
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

// Fonction pour jouer un bruit sourd
const playHitSound = () => {
  // Créer un contexte audio pour générer un son
  if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
    const AudioContextClass = AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    // Créer un oscillateur pour le bruit sourd
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configuration pour un bruit sourd (basse fréquence)
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(30, audioContext.currentTime + 0.1);
    
    // Enveloppe du son (attaque rapide, déclin progressif)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.type = 'square'; // Son plus dur
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    console.log('💥 BONK! Bruit sourd joué !');
  } else {
    console.log('💥 BONK! (son non supporté)');
  }
};

// Sélectionner 4 trous aléatoires parmi les 9 disponibles
const selectRandomHoles = (): number[] => {
  const allHoles = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const selectedHoles: number[] = [];
  
  // Sélectionner 4 trous différents
  while (selectedHoles.length < 4) {
    const randomIndex = Math.floor(Math.random() * allHoles.length);
    const holeIndex = allHoles[randomIndex];
    
    if (!selectedHoles.includes(holeIndex)) {
      selectedHoles.push(holeIndex);
    }
  }
  
  return selectedHoles.sort((a, b) => a - b); // Trier pour cohérence
};

// Obtenir la position d'un trou dans la grille 3x3
const getHolePosition = (holeIndex: number): { top: string; left: string } => {
  const row = Math.floor(holeIndex / 3); // 0, 1, ou 2
  const col = holeIndex % 3; // 0, 1, ou 2
  
  // Centrer chaque trou dans sa sous-zone
  const top = `${(row * 33.33) + 16.67}%`; // 16.67%, 50%, 83.33%
  const left = `${(col * 33.33) + 16.67}%`; // 16.67%, 50%, 83.33%
  
  return { top, left };
};

// Composant Trou fixe
const Hole: React.FC<{ holeIndex: number }> = ({ holeIndex }) => {
  const position = getHolePosition(holeIndex);
  
  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)',
        zIndex: 1
      }}
    >
      {/* Trou dans le sol - FIXE */}
      <div
        style={{
          width: '120px',
          height: '80px',
          backgroundColor: '#0d0d0d',
          borderRadius: '50%',
          boxShadow: 'inset 0 8px 20px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.6)',
          border: '3px solid #000000'
        }}
      />
      
      {/* Ombre du trou pour plus de profondeur - FIXE */}
      <div
        style={{
          width: '140px',
          height: '25px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          borderRadius: '50%',
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          filter: 'blur(8px)',
          zIndex: -1
        }}
      />
    </div>
  );
};

// Composant Taupe dans un trou spécifique
const Mole: React.FC<MoleProps> = ({ holeIndex, fraction, isCorrect, onClick, isVisible, animationState, timeLeft }) => {
  const moleRef = useRef<HTMLDivElement>(null);
  const position = getHolePosition(holeIndex);

  const getMoleColor = () => {
    if (animationState === 'correct') return '#4CAF50'; // Vert pour succès
    if (animationState === 'incorrect') return '#F44336'; // Rouge pour échec
    return '#8B4513'; // Marron normal
  };

  // Animation de sortie progressive basée sur le temps
  const getMoleTransform = () => {
    if (!isVisible) return 'translateY(60px)'; // Complètement dans le trou
    
    if (animationState === 'correct') {
      return 'translateY(50px) rotate(25deg) scale(0.9)'; // Assommée verte
    }
    
    if (animationState === 'incorrect') {
      return 'translateY(-5px) scale(1.1)'; // Moqueuse, sort un peu plus
    }
    
    // Sortie progressive en fonction du temps restant (10s -> 0s)
    const progress = Math.max(0, (10 - timeLeft) / 10); // 0 à 1
    const yOffset = 60 - (progress * 75); // De 60px (dans le trou) à -15px (complètement sorti)
    return `translateY(${yOffset}px)`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5
      }}
    >
      {/* Taupe - SEULE À BOUGER */}
      <div
        ref={moleRef}
        onClick={onClick}
        style={{
          width: '80px',
          height: '80px',
          backgroundColor: getMoleColor(),
          borderRadius: '50% 50% 45% 45%',
          border: '3px solid #5d2e00',
          cursor: 'none',
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: animationState === 'none' ? 'all 0.5s ease-out' : 'all 0.4s ease',
          boxShadow: '0 8px 15px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.2)',
          transform: getMoleTransform(),
          background: `radial-gradient(circle at 30% 30%, ${getMoleColor()}, #654321)`
        }}
      >
        {/* Oreilles de la taupe */}
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          left: '12px', 
          width: '14px', 
          height: '20px', 
          backgroundColor: '#5d2e00', 
          borderRadius: '50%', 
          transform: 'rotate(-25deg)',
          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)'
        }} />
        <div style={{ 
          position: 'absolute', 
          top: '5px', 
          right: '12px', 
          width: '14px', 
          height: '20px', 
          backgroundColor: '#5d2e00', 
          borderRadius: '50%', 
          transform: 'rotate(25deg)',
          boxShadow: 'inset 2px 2px 4px rgba(0,0,0,0.3)'
        }} />
        
        {/* Intérieur des oreilles */}
        <div style={{ 
          position: 'absolute', 
          top: '8px', 
          left: '15px', 
          width: '6px', 
          height: '8px', 
          backgroundColor: '#FF69B4', 
          borderRadius: '50%', 
          transform: 'rotate(-25deg)'
        }} />
        <div style={{ 
          position: 'absolute', 
          top: '8px', 
          right: '15px', 
          width: '6px', 
          height: '8px', 
          backgroundColor: '#FF69B4', 
          borderRadius: '50%', 
          transform: 'rotate(25deg)'
        }} />
        
        {/* Yeux de la taupe - changeant selon l'état */}
        <div style={{ 
          position: 'absolute', 
          top: '25px', 
          left: '20px', 
          width: '10px', 
          height: animationState === 'correct' ? '3px' : '10px', // Yeux fermés si assommée (correct)
          backgroundColor: 'black', 
          borderRadius: '50%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
          transform: animationState === 'correct' ? 'scaleY(0.2)' : 
                    animationState === 'incorrect' ? 'scaleY(1.2)' : 'scaleY(1)' // Yeux plus grands si moqueuse
        }} />
        <div style={{ 
          position: 'absolute', 
          top: '25px', 
          right: '20px', 
          width: '10px', 
          height: animationState === 'correct' ? '3px' : '10px',
          backgroundColor: 'black', 
          borderRadius: '50%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
          transform: animationState === 'correct' ? 'scaleY(0.2)' : 
                    animationState === 'incorrect' ? 'scaleY(1.2)' : 'scaleY(1)'
        }} />
        
        {/* Reflets dans les yeux - seulement si pas assommée */}
        {animationState !== 'correct' && (
          <>
            <div style={{ 
              position: 'absolute', 
              top: '27px', 
              left: '22px', 
              width: '3px', 
              height: '3px', 
              backgroundColor: 'white', 
              borderRadius: '50%'
            }} />
            <div style={{ 
              position: 'absolute', 
              top: '27px', 
              right: '22px', 
              width: '3px', 
              height: '3px', 
              backgroundColor: 'white', 
              borderRadius: '50%'
            }} />
          </>
        )}
        
        {/* Nez de la taupe */}
        <div style={{ 
          position: 'absolute', 
          top: '38px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: '8px', 
          height: '6px', 
          backgroundColor: '#FF1493', 
          borderRadius: '50%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }} />
        
        {/* Bouche - change selon l'état */}
        <div style={{ 
          position: 'absolute', 
          top: '48px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: animationState === 'incorrect' ? '16px' : '3px', // Bouche large si moqueuse
          height: animationState === 'correct' ? '12px' : '8px', // Bouche ouverte si assommée
          backgroundColor: 'black', 
          borderRadius: animationState === 'correct' ? '50%' : 
                        animationState === 'incorrect' ? '8px' : '2px', // Sourire moqueur
          border: animationState === 'incorrect' ? '1px solid black' : 'none'
        }} />
        
        {/* Langue moqueuse si incorrect */}
        {animationState === 'incorrect' && (
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '4px',
            height: '6px',
            backgroundColor: '#FF69B4',
            borderRadius: '50%'
          }} />
        )}
        
        {/* Moustaches */}
        <div style={{ position: 'absolute', top: '40px', left: '6px', width: '16px', height: '1px', backgroundColor: 'black' }} />
        <div style={{ position: 'absolute', top: '43px', left: '6px', width: '16px', height: '1px', backgroundColor: 'black' }} />
        <div style={{ position: 'absolute', top: '40px', right: '6px', width: '16px', height: '1px', backgroundColor: 'black' }} />
        <div style={{ position: 'absolute', top: '43px', right: '6px', width: '16px', height: '1px', backgroundColor: 'black' }} />
        
        {/* Étoiles d'assommage pour succès */}
        {animationState === 'correct' && (
          <>
            <div style={{ 
              position: 'absolute', 
              top: '-8px', 
              left: '8px', 
              fontSize: '16px',
              animation: 'sparkle 1s infinite'
            }}>⭐</div>
            <div style={{ 
              position: 'absolute', 
              top: '-12px', 
              right: '12px', 
              fontSize: '14px',
              animation: 'sparkle 1s infinite 0.3s'
            }}>✨</div>
            <div style={{ 
              position: 'absolute', 
              top: '-4px', 
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '15px',
              animation: 'sparkle 1s infinite 0.6s'
            }}>💫</div>
          </>
        )}
        
        {/* Expressions moqueuses pour échec */}
        {animationState === 'incorrect' && (
          <>
            <div style={{ 
              position: 'absolute', 
              top: '-12px', 
              left: '8px', 
              fontSize: '14px',
              animation: 'mockingAnimation 0.5s infinite'
            }}>😝</div>
            <div style={{ 
              position: 'absolute', 
              top: '-8px', 
              right: '8px', 
              fontSize: '12px',
              animation: 'mockingAnimation 0.5s infinite 0.2s'
            }}>😜</div>
          </>
        )}
      </div>
      
      {/* Panneau avec la réponse - Se déplace avec la taupe */}
      <div
        style={{
          backgroundColor: '#FFF8DC',
          color: '#8B4513',
          padding: '10px 14px',
          borderRadius: '10px',
          border: '2px solid #8B4513',
          fontSize: '18px',
          fontWeight: 'bold',
          marginTop: '20px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          zIndex: 4,
          minWidth: '60px',
          textAlign: 'center',
          position: 'relative',
          transform: `rotate(-1deg) ${getMoleTransform()}`, // Suit le mouvement de la taupe
          background: 'linear-gradient(145deg, #FFF8DC, #F5DEB3)',
          transition: animationState === 'none' ? 'all 0.5s ease-out' : 'all 0.4s ease',
          opacity: isVisible ? 1 : 0
        }}
      >
        {/* Poteau du panneau */}
        <div style={{
          position: 'absolute',
          bottom: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '6px',
          height: '18px',
          backgroundColor: '#8B4513',
          borderRadius: '3px'
        }} />
        {fractionToString(fraction)}
      </div>
    </div>
  );
};

// Curseur marteau personnalisé
const HammerCursor: React.FC<{ mousePosition: { x: number; y: number } }> = ({ mousePosition }) => {
  return (
    <div
      style={{
        position: 'fixed',
        left: mousePosition.x - 20,
        top: mousePosition.y - 10,
        width: '40px',
        height: '40px',
        pointerEvents: 'none',
        zIndex: 1000,
        transform: 'rotate(-15deg)'
      }}
    >
      {/* Manche du marteau */}
      <div style={{
        position: 'absolute',
        bottom: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '6px',
        height: '30px',
        backgroundColor: '#8B4513',
        borderRadius: '3px',
        background: 'linear-gradient(90deg, #654321, #8B4513, #654321)'
      }} />
      
      {/* Tête du marteau */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '20px',
        height: '12px',
        backgroundColor: '#696969',
        borderRadius: '2px',
        border: '1px solid #2F4F4F',
        background: 'linear-gradient(145deg, #808080, #696969, #2F4F4F)'
      }} />
      
      {/* Reflet métallique */}
      <div style={{
        position: 'absolute',
        top: '2px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '16px',
        height: '3px',
        backgroundColor: '#C0C0C0',
        borderRadius: '1px'
      }} />
    </div>
  );
};

// Composant principal du jeu
export const FractionGame: React.FC = () => {
  const [gameState, setGameState] = useState<'playing' | 'finished'>('playing');
  const [stats, setStats] = useState<GameStats>({ score: 0, currentQuestion: 1, timeLeft: 10 });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [molesVisible, setMolesVisible] = useState(false);
  const [selectedMole, setSelectedMole] = useState<number | null>(null);
  const [moleAnimations, setMoleAnimations] = useState<Array<'none' | 'correct' | 'incorrect'>>([]);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Suivre la position de la souris
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Générer une question aléatoire
  const generateQuestion = (): Question => {
    const questionType = Math.random();
    const denominators = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
    const numerators = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    // Sélectionner 4 trous aléatoires parmi les 9
    const selectedHoles = selectRandomHoles();
    
    if (questionType < 0.33) {
      // Addition
      const fraction1: Fraction = {
        numerator: numerators[Math.floor(Math.random() * numerators.length)],
        denominator: denominators[Math.floor(Math.random() * denominators.length)]
      };
      
      const fraction2: Fraction = {
        numerator: numerators[Math.floor(Math.random() * numerators.length)],
        denominator: denominators[Math.floor(Math.random() * denominators.length)]
      };
      
      const correctAnswer = addFractions(fraction1, fraction2);
      const wrongAnswers = generateWrongAnswers(correctAnswer, 3);
      const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      
      return {
        fraction1,
        fraction2,
        operation: '+',
        correctAnswer,
        options,
        questionText: `${fractionToString(fraction1)} + ${fractionToString(fraction2)} = ?`,
        selectedHoles
      };
    } else if (questionType < 0.66) {
      // Soustraction
      const fraction1: Fraction = {
        numerator: numerators[Math.floor(Math.random() * numerators.length)],
        denominator: denominators[Math.floor(Math.random() * denominators.length)]
      };
      
      const fraction2: Fraction = {
        numerator: numerators[Math.floor(Math.random() * numerators.length)],
        denominator: denominators[Math.floor(Math.random() * denominators.length)]
      };
      
      const correctAnswer = subtractFractions(fraction1, fraction2);
      const wrongAnswers = generateWrongAnswers(correctAnswer, 3);
      const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      
      return {
        fraction1,
        fraction2,
        operation: '-',
        correctAnswer,
        options,
        questionText: `${fractionToString(fraction1)} - ${fractionToString(fraction2)} = ?`,
        selectedHoles
      };
    } else {
      // Simplification
      const baseFraction: Fraction = {
        numerator: numerators[Math.floor(Math.random() * numerators.length)],
        denominator: denominators[Math.floor(Math.random() * denominators.length)]
      };
      
      // Créer une fraction non simplifiée en multipliant par un facteur commun
      const factor = Math.floor(Math.random() * 4) + 2; // facteur entre 2 et 5
      const unsimplifiedFraction: Fraction = {
        numerator: baseFraction.numerator * factor,
        denominator: baseFraction.denominator * factor
      };
      
      const correctAnswer = simplifyFraction(unsimplifiedFraction);
      const wrongAnswers = generateWrongAnswers(correctAnswer, 3);
      const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
      
      return {
        operation: 'simplify',
        correctAnswer,
        options,
        questionText: `Simplifie : ${fractionToString(unsimplifiedFraction)} = ?`,
        selectedHoles
      };
    }
  };

  // Générer des réponses incorrectes
  const generateWrongAnswers = (correctAnswer: Fraction, count: number): Fraction[] => {
    const wrongAnswers: Fraction[] = [];
    const maxAttempts = 50;
    let attempts = 0;
    
    while (wrongAnswers.length < count && attempts < maxAttempts) {
      attempts++;
      const wrongFraction: Fraction = {
        numerator: Math.floor(Math.random() * 25) + 1,
        denominator: Math.floor(Math.random() * 20) + 1
      };
      
      const simplified = simplifyFraction(wrongFraction);
      
      if (!fractionsEqual(simplified, correctAnswer) && 
          !wrongAnswers.some(w => fractionsEqual(w, simplified))) {
        wrongAnswers.push(simplified);
      }
    }
    
    // Si on n'a pas assez de mauvaises réponses, en générer des basiques
    while (wrongAnswers.length < count) {
      const num = correctAnswer.numerator + Math.floor(Math.random() * 6) - 3;
      const den = correctAnswer.denominator + Math.floor(Math.random() * 6) - 3;
      if (num > 0 && den > 0) {
        const wrongFraction = simplifyFraction({ numerator: num, denominator: den });
        if (!fractionsEqual(wrongFraction, correctAnswer) && 
            !wrongAnswers.some(w => fractionsEqual(w, wrongFraction))) {
          wrongAnswers.push(wrongFraction);
        }
      }
    }
    
    return wrongAnswers.slice(0, count);
  };

  // Initialiser une nouvelle question
  const initializeQuestion = () => {
    const question = generateQuestion();
    setCurrentQuestion(question);
    setMolesVisible(false);
    setSelectedMole(null);
    setMoleAnimations(['none', 'none', 'none', 'none']);
    setQuestionAnswered(false);
    setStats(prev => ({ ...prev, timeLeft: 10 }));
    
    // Afficher les taupes après un petit délai
    setTimeout(() => {
      setMolesVisible(true);
    }, 1000);
  };

  // Gérer la sélection d'une taupe
  const handleMoleClick = (moleIndex: number) => {
    if (questionAnswered || !currentQuestion) return;
    
    setSelectedMole(moleIndex);
    setQuestionAnswered(true);
    
    const selectedFraction = currentQuestion.options[moleIndex];
    const isCorrect = fractionsEqual(selectedFraction, currentQuestion.correctAnswer);
    
    // Jouer le bruit sourd
    playHitSound();
    
    // Les autres taupes se cachent immédiatement
    setMolesVisible(false);
    
    // Seule la taupe cliquée reste visible avec l'animation appropriée
    const newAnimations: Array<'none' | 'correct' | 'incorrect'> = ['none', 'none', 'none', 'none'];
    newAnimations[moleIndex] = isCorrect ? 'correct' : 'incorrect';
    setMoleAnimations([...newAnimations]);
    
    // Rendre visible seulement la taupe cliquée
    setTimeout(() => {
      if (currentQuestion) {
        setMolesVisible(true);
      }
    }, 100);
    
    // Mettre à jour le score
    const scoreChange = isCorrect ? 3 : -1;
    setStats(prev => ({ 
      ...prev, 
      score: Math.max(0, prev.score + scoreChange)
    }));
    
    // Passer à la question suivante après un délai
    setTimeout(() => {
      nextQuestion();
    }, 2500);
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
      }, 800);
    }
  };

  // Timer effect avec animation de sortie progressive
  useEffect(() => {
    if (gameState === 'finished' || questionAnswered) return;
    
    const timer = setInterval(() => {
      setStats(prev => {
        if (prev.timeLeft <= 1) {
          // Temps écoulé, toutes les taupes rentrent dans leurs trous
          setMolesVisible(false);
          setTimeout(() => {
            nextQuestion();
          }, 500);
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
    setStats({ score: 0, currentQuestion: 1, timeLeft: 10 });
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
        <h1 style={{ fontSize: '3rem', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>🎯 Jeu Terminé !</h1>
        <div style={{
          background: 'rgba(255,255,255,0.2)',
          padding: '30px',
          borderRadius: '20px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
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
              transition: 'all 0.3s',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#45a049';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#4CAF50';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔄 Rejouer
          </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.5rem',
      background: 'linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)'
    }}>Chargement...</div>;
  }

  return (
    <div style={{
      height: '100vh',
      background: 'linear-gradient(135deg, #87CEEB 0%, #98FB98 100%)',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      cursor: 'none' // Cacher le curseur par défaut
    }}>
      {/* Curseur marteau personnalisé */}
      <HammerCursor mousePosition={mousePosition} />

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
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
          Question {stats.currentQuestion}/10
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#333' }}>
          Score: {stats.score}
        </div>
        <div style={{ 
          fontSize: '1.2rem', 
          fontWeight: 'bold',
          color: stats.timeLeft <= 3 ? '#ff4444' : '#333',
          animation: stats.timeLeft <= 3 ? 'pulse 1s infinite' : undefined
        }}>
          ⏰ {stats.timeLeft}s
        </div>
      </div>

      {/* Question */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        background: 'rgba(255,255,255,0.9)',
        padding: '25px',
        borderRadius: '15px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          margin: '0',
          color: '#333',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }}>
          {currentQuestion.questionText}
        </h2>
      </div>

      {/* Zone de jeu - Pelouse verte avec grille 3x3 de trous */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: 'radial-gradient(circle at 50% 50%, #90EE90, #228B22)',
        borderRadius: '20px',
        border: '4px solid #006400',
        maxWidth: '800px',
        margin: '0 auto',
        width: '100%',
        boxShadow: '0 8px 16px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.1)',
        overflow: 'hidden'
      }}>
        {/* Texture d'herbe subtile */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, rgba(0,100,0,0.1) 1px, transparent 1px),
            radial-gradient(circle at 80% 80%, rgba(0,100,0,0.1) 1px, transparent 1px),
            radial-gradient(circle at 60% 40%, rgba(0,100,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px, 25px 25px, 35px 35px'
        }} />
        
        {/* Grille 3x3 de trous - TOUJOURS VISIBLES */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(holeIndex => (
          <Hole key={holeIndex} holeIndex={holeIndex} />
        ))}
        
        {/* Taupes dans les trous sélectionnés */}
        {currentQuestion.options.slice(0, 4).map((fraction, moleIndex) => (
          <Mole
            key={`${stats.currentQuestion}-${moleIndex}`}
            holeIndex={currentQuestion.selectedHoles[moleIndex]}
            fraction={fraction}
            isCorrect={fractionsEqual(fraction, currentQuestion.correctAnswer)}
            onClick={() => handleMoleClick(moleIndex)}
            isVisible={questionAnswered ? moleIndex === selectedMole : molesVisible}
            animationState={moleAnimations[moleIndex]}
            timeLeft={stats.timeLeft}
          />
        ))}
      </div>

      {/* Styles CSS pour les animations */}
      <style>
        {`
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          
          @keyframes mockingAnimation {
            0%, 100% { transform: rotate(-5deg) scale(1); }
            50% { transform: rotate(5deg) scale(1.1); }
          }
          
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};