import { alignmentSample, initialOffset } from './alignment.js';

const durations = [6.4, 8, 8, 7.8, 7, 8.2];
const gate = .62;
export const stationMap = {vcsel:[0,0,0,1,1,2], cpo:[0,0,1,2,2,2]};

export class Simulation {
  constructor() { this.home(); }
  home() {
    this.open('overview');
    this.floorTime=0;
  }
  open(route,tour=false) {
    this.route=route;
    this.tour=tour;
    this.playing=true;
    this.seek(0);
  }
  seek(step) {
    this.step=step;
    this.elapsed=0;
    this.finished=false;
    this.inspect=false;
    this.offset={...initialOffset};
    this.lockTime=0;
    this.holdTime=0;
    this.locked=false;
    this.phase='run';
  }
  get interactive(){return this.route==='cpo' && this.step===2 && !this.tour;}
  get progress(){return Math.min(1,this.elapsed/durations[this.step]);}
  get modelAlignment(){
    if(this.phase==='align') return {...this.offset,blend:Math.min(1,this.holdTime/.35)};
    if(this.phase==='fix') {
      const rest=1-Math.min(1,this.lockTime/.5);
      return {x:this.offset.x*rest,z:this.offset.z*rest};
    }
    return null;
  }
  scrub(value){
    if(this.phase!=='run'||this.inspect)return;
    let p=Math.max(0,Math.min(1,value));
    if(this.interactive&&!this.locked)p=Math.min(p,gate);
    this.elapsed=p*durations[this.step];
    this.finished=false;
    this.playing=false;
    if(this.interactive&&!this.locked&&p===gate){this.phase='align';this.holdTime=.35;}
  }
  move(x,z) {
    if(this.phase!=='align')return;
    this.offset={x:Math.max(-1,Math.min(1,x)),z:Math.max(-1,Math.min(1,z))};
  }
  fix(){
    if(this.phase!=='align'||!alignmentSample(this.offset.x,this.offset.z).ready)return false;
    this.phase='fix';this.lockTime=0;this.playing=true;return true;
  }
  takeOver(){
    if(this.route==='cpo' && this.step===2 && this.progress>=gate)this.locked=true;
    this.tour=false;this.playing=false;
  }
  toggle(){
    if(this.phase!=='run'||this.inspect)return;
    if(this.finished){this.open(this.route);return;}
    this.playing=!this.playing;
  }
  advance(dt) {
    if(this.inspect)return false;
    if(this.phase==='align'){this.holdTime+=dt;return false;}
    if(!this.playing)return false;
    if(this.phase==='fix'){
      this.lockTime+=dt;
      if(this.lockTime<.55)return false;
      this.elapsed=durations[this.step]*.87;
      this.phase='run';this.locked=true;return true;
    }
    this.elapsed+=dt;
    if(this.interactive&&!this.locked&&this.progress>=gate){
      this.elapsed=durations[this.step]*gate;
      this.phase='align';return true;
    }
    if(this.elapsed<durations[this.step])return false;
    if(this.step<5){this.seek(this.step+1);return true;}
    if(this.tour){this.open(this.route==='vcsel'?'cpo':'vcsel',true);return true;}
    this.finished=true;this.playing=false;this.elapsed=durations[5];return true;
  }
}
