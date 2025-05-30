import { createPlayer, drawCards, incrementTurn } from './game.js';
import { cards } from './cards.js';
import { playActionCardEffect } from './actionCards.js';

const player = createPlayer();
player.log = logMessage;
drawCards(player, 5);
renderDeckInventory();  // Display the initial deck inventory right after game setup


const handEl = document.getElementById('player-hand');
const marketplaceEl = document.getElementById('marketplace');
const logEl = document.getElementById('log');
const goldDisplay = document.getElementById('gold-display');
const victoryDisplay = document.getElementById('victory-display'); 


updateVictoryPoints();

// Define the cards and their initial supply count in the marketplace
export const marketSupply = [
  { card: cards.copper, count: 46 },
  { card: cards.silver, count: 40 },
  { card: cards.gold, count: 30 },
  { card: cards.estate, count: 8 },
  { card: cards.duchy, count: 8 },
  { card: cards.province, count: 8 },
  { card: cards.smithy, count: 10 },
  { card: cards.village, count: 10 },
  { card: cards.market, count: 10 },
  { card: cards.cellar, count: 10 },
  { card: cards.festival, count: 10 },
  { card: cards.library, count: 10 },
  { card: cards.laboratory, count: 10 },
  { card: cards.chapel, count: 10 },
  { card: cards.throneRoom, count: 10 },
  { card: cards.workshop, count: 10 },
  { card: cards.woodcutter, count: 10 },
  { card: cards.vassal, count: 10 },
  { card: cards.remodel, count: 10 },
  { card: cards.mine, count: 10 },
  { card: cards.moneylender, count: 10 },
  { card: cards.feast, count: 10 },
  { card: cards.councilRoom, count: 10 },
  { card: cards.adventurer, count: 10 },
  { card: cards.gardens, count: 8 },         // Gardens usually matches Estate/Duchy/Province supply
  { card: cards.treasury, count: 10 },
  { card: cards.greatHall, count: 8 },       // Great Hall usually matches Estate/Duchy/Province too
  { card: cards.masquerade, count: 10 },
  { card: cards.harbinger, count: 10 }
];


function renderHand() {
  // Clear previous hand content and create a new container for the cards
  handEl.innerHTML = '<h2>Your Hand</h2>';
  
  // Create the card container div
  const cardContainer = document.createElement('div');
  cardContainer.className = 'card-container'; // Add the class for styling

    // Loop through each card in the player's hand and create a card element
  player.hand.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'card'; // Add the 'card' class for styling
    cardEl.innerHTML = `
      <strong>${card.name}</strong><br>
      <em>Type:</em> ${card.type}<br>
      <em>Cost:</em> ${card.cost}<br>
      <em>${card.description || ''}</em>
    `;
  
        // Add "Play" button only if player has actions left and card is an Action type
    if (player.actions > 0 && card.type.includes('Action')) {
      const playBtn = document.createElement('button');
      playBtn.textContent = 'Play';
      playBtn.addEventListener('click', () => playActionCard(card));
      cardEl.appendChild(document.createElement('br'));
      cardEl.appendChild(playBtn);
    }

    // Append the card element to the card container
    cardContainer.appendChild(cardEl);
  });
  
  // Append the card container to the hand element
  handEl.appendChild(cardContainer);

  // Update the gold display and deck/discard counts
  updateGoldDisplay();
  renderDeckAndDiscardCount();
}

// Make renderHand globally accessible
window.renderHand = renderHand;

function updateGoldDisplay() {
  const treasureGold = player.hand
    .filter(card => card.type === 'Treasure')
    .reduce((sum, card) => sum + card.value, 0);

  player.gold = treasureGold + player.bonusGold;
  goldDisplay.textContent = `Gold: ${player.gold}`;
}

window.updateGoldDisplay = updateGoldDisplay;

function renderMarketplace() {
  marketplaceEl.innerHTML = '<h2>Marketplace</h2>';

  const moneyCards = [];
  const victoryCards = [];
  const actionCards = [];

  // Split cards into groups
  marketSupply.forEach((slot) => {
    const type = slot.card.type;

    if (type.includes('Action')) {
      actionCards.push(slot);
    } else if (type.includes('Treasure')) {
      moneyCards.push(slot);
    } else if (type.includes('Victory')) {
      victoryCards.push(slot);
    }
  });

  // Sort action cards by cost ascending
  actionCards.sort((a, b) => a.card.cost - b.card.cost);

  // Helper to render a section
  function renderSection(title, cards) {
    if (cards.length > 0) {
      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = title;
      marketplaceEl.appendChild(sectionTitle);

      cards.forEach((slot) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';

        const totalGold = player.gold;

        if (slot.card.cost > totalGold || player.buys <= 0) {
          cardEl.classList.add('disabled');
        } else {
          cardEl.classList.remove('disabled');
        }

        cardEl.innerHTML = `
          <strong>${slot.card.name}</strong><br>
          <em>Type:</em> ${slot.card.type}<br>
          <em>Cost:</em> ${slot.card.cost}<br>
          <em>${slot.card.description || ''}</em><br>
          Left: ${slot.count}
        `;

        if (!cardEl.classList.contains('disabled')) {
          cardEl.addEventListener('click', () => buyCard(marketSupply.indexOf(slot)));
        }

        marketplaceEl.appendChild(cardEl);
      });
    }
  }

  // Render sections in order
  renderSection('Money Cards', moneyCards);
  renderSection('Victory Cards', victoryCards);
  renderSection('Action Cards', actionCards);
}



window.renderMarketplace = renderMarketplace;

function logMessage(msg) {
  const entry = document.createElement('div');
  entry.textContent = msg;
  logEl.appendChild(entry);  // This adds the log message below the header
}

function buyCard(index) {
  const slot = marketSupply[index];
  const cost = slot.card.cost;

  if (player.buys <= 0) {
    logMessage("You don't have any buys left this turn.");
    return;
  }

  // Calculate total available gold correctly (including player gold and bonus gold)
  const treasureGold = player.hand
    .filter(card => card.type === 'Treasure')
    .reduce((sum, card) => sum + card.value, 0);
  
  const totalGold = treasureGold + player.bonusGold;

  if (slot.count <= 0) {
    logMessage(`${slot.card.name} is sold out.`);
    return;
  }

  if (totalGold < cost) {
    logMessage(`Not enough gold to buy ${slot.card.name}.`);
    return;
  }

  let remainingCost = cost;

  // Remove treasure cards from hand first and update gold accordingly
  for (let i = 0; i < player.hand.length && remainingCost > 0; i++) {
    const card = player.hand[i];
    if (card.type === 'Treasure') {
      remainingCost -= card.value;
      player.discard.push(card);
      player.hand.splice(i, 1);
      i--;
    }
  }

  // If there's still cost remaining, subtract it from bonusGold
  if (remainingCost > 0) {
    player.bonusGold -= remainingCost;
  }

  // Don't zero out player.gold unless all the gold is spent
  // If remaining cost is 0, the gold from the hand has been fully used
  if (remainingCost === 0) {
    // You don't need to reset player.gold here because it will be updated after the turn anyway
    // player.gold = 0; 
  }

  player.bonusGold = 0; // Reset bonus gold after purchase

  // Update the gold display after purchase
  updateGoldDisplay();

  // Add purchased card to discard pile
  player.discard.push(slot.card);
  slot.count -= 1;

  player.buys--;
  let cardName = slot.card.name;
  let cardStartsWith = cardName.charAt(0).toLowerCase();
  let vowels = ["a", "e", "i", "o", "u"];
  if (vowels.includes(cardStartsWith)) logMessage(`You bought an ${slot.card.name}.`);
  else logMessage(`You bought a ${slot.card.name}.`);

  renderDeckAndDiscardCount();
  renderDeckInventory();
  renderActionsAndBuys();
  renderMarketplace();
  renderHand(); // Ensure hand reflects removed Treasures
  updateVictoryPoints();
}




renderHand();
renderMarketplace();

const nextTurnBtn = document.getElementById('next-turn');
nextTurnBtn.addEventListener('click', nextTurn);

function nextTurn() {
    // Log the current state of the deck and discard
  console.log("=== Starting New Turn ===");
  console.log("Deck (top to bottom):", player.deck);
  console.log("Discard (most recent first):", player.discard);

  player.actions = 1;
  player.buys = 1;
  player.bonusGold = 0;

  player.discard.push(...player.hand);  // Move hand to discard
  player.hand = [];

  drawCards(player, 5);  // Draw 5 cards for the new turn

  incrementTurn(); // ⬅️ Add this line

  renderDeckInventory();
  logMessage("You started a new turn.");
  renderHand();
  renderDeckAndDiscardCount();
  renderMarketplace();
  renderActionsAndBuys();
  updateVictoryPoints();
}

function renderDeckAndDiscardCount() {
  const deckCountEl = document.getElementById('deck-count');
  const discardCountEl = document.getElementById('discard-count');

  deckCountEl.textContent = `Deck: ${player.deck.length} cards`;
  discardCountEl.textContent = `Discard Pile: ${player.discard.length} cards`;
}

window.renderDeckAndDiscardCount = renderDeckAndDiscardCount;


function renderActionsAndBuys() {
  const actionsLeftEl = document.getElementById('actions-left');
  const buysLeftEl = document.getElementById('buys-left');

  actionsLeftEl.textContent = `Actions: ${player.actions}`;
  buysLeftEl.textContent = `Buys: ${player.buys}`;
}

function playActionCard(card) {
  if (player.actions <= 0) {
    logMessage("No actions left to play.");
    return;
  }

  player.actions--;
  let cardName = card.name;
  let cardStartsWith = cardName.charAt(0).toLowerCase();
  let vowels = ["a", "e", "i", "o", "u"];
  if (vowels.includes(cardStartsWith)) logMessage(`You played an ${card.name}.`);
  else logMessage(`You played a ${card.name}.`);

  // 🔽 Use the new handler function from actionCards.js
  playActionCardEffect(card, player);

  // Remove card from hand and place it in discard
  const index = player.hand.indexOf(card);
  if (index !== -1) {
    player.hand.splice(index, 1);
    player.discard.push(card);
  }

  updateGoldDisplay();
  renderActionsAndBuys();
  renderHand();
  renderMarketplace();
  renderDeckAndDiscardCount();
}

function renderDeckInventory() {
  const deckListEl = document.getElementById('deck-list');
  deckListEl.innerHTML = '';

  // Create a helper function to render the list of cards
  const renderCardCounts = (cards, title) => {
    const cardCounts = {};

    // Count the occurrences of each card
    cards.forEach(card => {
      if (cardCounts[card.name]) {
        cardCounts[card.name]++;
      } else {
        cardCounts[card.name] = 1;
      }
    });

    // Add the list for this area (deck, discard, or trash)
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = title;
    deckListEl.appendChild(sectionTitle);

    let totalCards = 0;
    for (const cardName in cardCounts) {
      const listItem = document.createElement('li');
      listItem.textContent = `${cardName}: ${cardCounts[cardName]}`;
      deckListEl.appendChild(listItem);
      totalCards += cardCounts[cardName];
    }

    const totalCountEl = document.createElement('li');
    totalCountEl.textContent = `Total Cards: ${totalCards}`;
    deckListEl.appendChild(totalCountEl);
  };

  // Render deck (all owned cards), discard, and trash
  renderCardCounts(player.deck, 'Deck (All Cards)');
  renderCardCounts(player.discard, 'Discard (Most Recent)');
  renderCardCounts(player.trash, 'Trash');
}



window.renderDeckInventory = renderDeckInventory;

function updateVictoryPoints() {
  // Calculate the victory points from all cards in hand, deck, and discard
  const victoryPoints = [...player.hand, ...player.deck, ...player.discard]
    .filter(card => card.type.includes('Victory'))
    .reduce((sum, card) => sum + (card.points || 0), 0);

  // Update the player's victory points
  player.victoryPoints = victoryPoints;

  // Update the victory points display
  victoryDisplay.textContent = `Victory Points: ${player.victoryPoints}`;
}

window.updateVictoryPoints = updateVictoryPoints;

function shuffleDiscardIntoDeck(player) {
  if (player.discard.length === 0) return;

  // Move all discard cards into the deck
  player.deck = player.deck.concat(player.discard);
  player.discard = [];

  // Shuffle the deck
  for (let i = player.deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [player.deck[i], player.deck[j]] = [player.deck[j], player.deck[i]];
  }

  player.log("Shuffled discard pile into deck.");
}

window.shuffleDiscardIntoDeck = shuffleDiscardIntoDeck;
