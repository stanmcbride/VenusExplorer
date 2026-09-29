import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from './engine.mjs';
const make=(players=3,variant='current')=>new Engine({players,variant,terrainSeed:17});
function supply(e){const s=e.s.cardSupply;const cards=[...s.hands.flat(),...s.drawPile,...s.discardPile];assert.equal(cards.length,54);assert.equal(new Set(cards.map(c=>c.id)).size,54);assert.ok(s.hands.every(h=>h.length===4));for(let i=0;i<6;i++)assert.equal(cards.filter(c=>Math.floor(c.id/9)===i).length,9);}
function finish(e){e.call('setPassScreen',false);e.call('beginMulligan');e.call('resolveAction');e.call('skipMining');e.call('endTurn');}
function fixtureDrone(e){const card={id:900,left:{kind:'drone',amount:6,label:'Drone'},right:{kind:'crawler',amount:3,label:'Crawler'}};e.call('setCardSupply',{...e.s.cardSupply,hands:e.s.hands.map((h,s)=>s===e.s.active?[card,...h.slice(1)]:h)});e.call('chooseSide','left',card);return e.neighbors[e.s.crawlerPositions[e.s.active]][0];}
test('baseline tuned counts, original thresholds, first draw and reset at all player counts',()=>{
 const expected={2:[67,6,5],3:[100,10,8],4:[139,17,11]};
 for(const n of [2,3,4]){const e=make(n),[size,volcs,target]=expected[n];assert.equal(e.s.bagSize,size);assert.equal(e.s.currentCounts.volcano,volcs);assert.equal(e.s.volcanoTarget,target);assert.equal(e.s.bag.length,size-1);assert.equal(e.s.setAsideTiles.length,1);supply(e);finish(e);assert.equal(e.s.setAsideTiles.length,2);e.call('setupGame',n,'current');assert.equal(e.s.setAsideTiles.length,1);assert.equal(e.s.mulligan,false);assert.equal(e.s.gameOver,false);}
});
test('one tile before every turn, no extra round draw, privacy cannot advance game',()=>{
 for(const n of [2,3,4]){const e=make(n);e.call('setBag',Array(100).fill('plain'));e.call('setSetAsideTiles',[]);for(let t=0;t<2*n;t++){finish(e);assert.equal(e.s.setAsideTiles.length,t+1);assert.equal(e.s.bag.length,99-t);const saved=e.save();e.call('beginMulligan');e.call('endTurn');assert.deepEqual(e.save(),saved);} }
});
test('eruption from next-turn draw finishes that round at every triggering seat',()=>{
 for(const n of [2,3,4])for(let seat=0;seat<n;seat++){const e=make(n);e.call('setBag',Array(100).fill('plain'));e.call('setSetAsideTiles',Array(e.s.volcanoTarget-1).fill('volcano'));const prior=(seat+n-1)%n;e.call('setActive',prior);e.call('setBag',['volcano',...e.s.bag]);finish(e);assert.equal(e.s.active,seat);assert.equal(e.s.gameOver,false);for(let s=seat;s<n;s++){assert.equal(e.s.active,s);const before=e.s.bag.length;finish(e);assert.equal(e.s.gameOver,s===n-1);assert.equal(e.s.bag.length,before-(s===n-1?0:1));}assert.equal(e.s.passScreen,false);}
});
test('drone eruption cannot interrupt action, claims or final round; reveals cannot undo',()=>{
 for(const n of [2,3,4])for(let seat=0;seat<n;seat++){const e=make(n);e.call('setActive',seat);e.call('setSetAsideTiles',Array(e.s.volcanoTarget-1).fill('volcano'));const i=fixtureDrone(e);e.call('setBoard',e.s.board.map((t,j)=>j===i?{...t,terrain:'unknown'}:t));e.call('setBag',['volcano','high',...Array(100).fill('plain')]);e.call('handleTile',i);assert.equal(e.s.gameOver,false);const saved=e.save();e.call('undoStep');assert.deepEqual(e.save(),saved);const next=e.neighbors[i].find(j=>e.s.board[j].terrain==='unknown');e.call('handleTile',next);assert.equal(e.s.scores[seat],1);e.call('resolveAction');e.call('endTurn');for(let s=seat+1;s<n;s++)finish(e);assert.equal(e.s.gameOver,true);const ended=e.save();e.call('beginMulligan');e.call('chooseSide','left',e.s.hands[e.s.active][0]);e.call('endTurn');assert.deepEqual(e.save(),ended);}
});
test('mulligan permits staying, destination mining, at most 3 steps and bridge credits',()=>{
 const e=make(2),start=e.s.crawlerPositions[0];e.call('setBoard',e.s.board.map((t,i)=>({...t,terrain:i===start?'low':'plain'})));e.call('setBag',Array(100).fill('plain'));
 const hand=e.s.hands[1];e.call('beginMulligan');supply(e);assert.deepEqual(e.s.hands[1],hand);const saved=e.save();e.call('beginMulligan');e.call('chooseSide','left',e.s.hands[0][0]);assert.deepEqual(e.save(),saved);e.call('resolveAction');assert.deepEqual(e.s.claimable,[start]);e.call('claimMine',start);assert.equal(e.s.scores[0],3);const deck=e.s.cardSupply;e.call('endTurn');assert.deepEqual(e.s.cardSupply,deck);
 e.call('setPassScreen',false);e.call('setActive',0);e.call('setBoard',e.s.board.map((t,i)=>({...t,terrain:i===start?'high':'plain',highClaim:null})));const j=e.neighbors[start].find(j=>j!==e.s.crawlerPositions[1]);e.call('setBoard',e.s.board.map((t,i)=>i===j?{...t,terrain:'canyon',bridge:true,bridgeOwner:1}:t));e.call('beginMulligan');for(const i of [j,start,j])e.call('handleTile',i);assert.equal(e.s.tileIsLegal(start),false);e.call('resolveAction');assert.deepEqual(e.s.claimable,[]);assert.equal(e.s.scores[1],6);supply(e);
});
test('mulligan is available with a dead hand, but forbidden after committing exploration',()=>{
 const e=make();e.call('setBoard',e.s.board.map(t=>({...t,terrain:'unknown'})));e.call('beginMulligan');e.call('resolveAction');assert.equal(e.s.actionResolved,true);e.call('endTurn');assert.equal(e.s.turn,2);e.call('setPassScreen',false);const i=fixtureDrone(e);e.call('handleTile',i);const saved=e.save();e.call('beginMulligan');assert.deepEqual(e.save(),saved);
});
test('repeated mulligans recycle discards, conserve all cards, and handle empty terrain bag',()=>{
 for(const n of [2,3,4]){const e=make(n);e.call('setBag',[]);e.call('setSetAsideTiles',[]);for(let t=0;t<100;t++){finish(e);supply(e);}assert.equal(e.s.setAsideTiles.length,0);}
});
test('all alternate layouts use scaled mix and original 8 percent eruption count',()=>{
 for(const v of ['tight','valley','triangle'])for(const n of [2,3,4]){const e=make(n,v);assert.equal(e.s.volcanoTarget,Math.max(1,Math.round(e.s.bagSize*.08)));assert.equal(e.s.currentCounts.volcano,Math.round(e.s.bagSize*({2:9,3:10,4:12}[n])/100));assert.equal(Object.values(e.s.currentCounts).reduce((a,b)=>a+b,0),e.s.bagSize);}
});
test('normal card turns preserve unplayed hands and recycle a randomized fixed deck',()=>{
 const e=make(3),other=new Engine({players:3,variant:'current',terrainSeed:981});assert.notDeepEqual(e.s.hands,other.s.hands);e.call('setBoard',e.s.board.map(t=>({...t,terrain:'plain'})));e.call('setBag',Array(1000).fill('plain'));e.call('setSetAsideTiles',[]);
 for(let t=0;t<160;t++){e.call('setPassScreen',false);const seat=e.s.active,prior=structuredClone(e.s.hands),card=prior[seat][0];const side=card.left.kind==='crawler'?'left':'right';e.call('chooseSide',side,card);const i=e.neighbors[e.s.crawlerPositions[seat]].find(i=>e.s.tileIsLegal(i));assert.notEqual(i,undefined);e.call('handleTile',i);e.call('resolveAction');e.call('endTurn');supply(e);for(let s=0;s<3;s++)if(s!==seat)assert.deepEqual(e.s.hands[s],prior[s]);for(const c of prior[seat])if(c.id!==card.id)assert.ok(e.s.hands[seat].some(x=>x.id===c.id));}
});
