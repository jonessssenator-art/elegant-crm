let enabled=localStorage.getItem('elegant-sound')==='on',context=null;
export const soundEnabled=()=>enabled;
export async function enableSound(){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Браузер не поддерживает звуковые уведомления');
 context??=new Audio();await context.resume();if(context.state!=='running')throw Error('Браузер пока блокирует звук. Нажмите кнопку ещё раз.');
 localStorage.setItem('elegant-sound','on');enabled=true;playSound('notice');
}
export function disableSound(){localStorage.setItem('elegant-sound','off');enabled=false;context?.suspend().catch(()=>{})}
export function unlockSound(){if(enabled){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context??=new Audio();context.resume().catch(()=>{})}}
export function playSound(kind='notice'){
 if(!enabled||context?.state!=='running')return false;
 const notes=kind==='payment'?[660,880]:kind==='reminder'?[523,659,523]:[587,740];
 notes.forEach((freq,i)=>{const start=context.currentTime+i*.12,osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.value=freq;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.055,start+.012);gain.gain.exponentialRampToValueAtTime(.001,start+.18);osc.connect(gain);gain.connect(context.destination);osc.start(start);osc.stop(start+.2);osc.onended=()=>{osc.disconnect();gain.disconnect()}});return true;
}
