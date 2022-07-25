/** ///////////////////////////////////////////////////////////////////////
 * WEB AUDIO WORKSHOP
    * AddEsso Synth
    * Author Alberto Barberis (www.albertobarberis.it)
    * January 2021

 * main.js :
    * global constants and variables
    * create and deal with an AudioContext
    * general and support functions
    * instantiation of an Voice instance
*/

/** ///////////////////////////////////////////////////////////////////////
  * GLOBAL CONSTANTS  
    * default initial values
    * default ranges
* /////////////////////////////////////////////////////////////////////// */

const INITIAL_MASTER_GAIN = 0.1; // initial master gain

const INITIAL_PARTIALS = 1; // initial partial number
const MIN_PARTIAL = 1; // minimum number of partials (1 : the fundamental)
const MAX_PARTIAL = 512; // maximum number of partials (can effect CPU usage!!)
const PARTIAL_ATTACK_TIME = 0.05; // attack time for each partial (second)
const PARTIAL_RELEASE_TIME = 0.05; // release time for each partial (second)

const INITIAL_FREQ = 261; // initial fundamental frequency

const INITIAL_TILT = 2.0; // initial spectral TILT - it defines the amplitude of the partials
const MIN_TILT = 0.001; // 0 means no spectral tilt
const MAX_TILT = 4; // 4 means a spectral tilt 1/(pow(partialIndex,tilt))

const INITIAL_TENSION = 1; // initial tension (harmonicity/inharmonicity) (1 : harmonic spectrum )
const MIN_TENSION = 0; // only the fundamental 
const MAX_TENSION = 2; // max tension value (defines how much the partials are more and more spread apart)

const INITIAL_A_TIME = 0.5; // initial attack time
const MIN_A_TIME = 0.01; // minimum attack time (second)
const MAX_A_TIME = 1; // maximum attack time (second)

const INITIAL_S_GAIN = 1; // initial sustain gain
const MIN_S_GAIN = 0.0; // minimum sustain gain
const MAX_S_GAIN = 1.0; // maximum sustain gain 

const INITIAL_R_TIME = 0.5; // initial release time (second)
const MIN_R_TIME = 0.02; // minimum release time (second)
const MAX_R_TIME = 1; // maximum release time (second)

const INITIAL_OCTAVE = 3; // initial octave (number of octave referred to the lowest key)

const INITIAL_CUT_OFF_DIAL = 0.5; // initial value of the cut off dial (0.5 : center)
const INITIAL_CUT_OFF = Nexus.scale(Math.pow(INITIAL_CUT_OFF_DIAL,2), 0, 1, 20, 20000);
const INITIAL_Q = 0.; // initial Q (quality) value of the filter

const INITIAL_MOD_FM_DIAL = 0.5 // initial value of the FM frequency modulator dial (0.5 : center)
const MIN_MOD_FM_FREQ = 10; // minimum frequency of the sinusoidal modulator for the FM
const MAX_MOD_FM_FREQ = 5000; // maximum frequency of the sinusoidal modulator for the FM
const INITIAL_MOD_FM_FREQ = Nexus.scale( Math.pow(INITIAL_MOD_FM_DIAL,4), 0, 1, MIN_MOD_FM_FREQ, MAX_MOD_FM_FREQ ); // initial mode FM freq
const INITIAL_MOD_INDEX = 0; // index of modulaton (0 : no modulation)
const MAX_INDEX_OF_MODULATION = 2000; // maimum index of modulation

const REV_URL = "http://reverbjs.org/Library/FalklandPalaceRoyalTennisCourt.m4a"; // url of the rev impulse response

const LOW_KEYBOARD_MIDI = 12;
const HIGH_KEYBOARD_MIDI = 36;

const KEY_MAP = { // map for conversion: pc key -> pitch (in index; 0 = C; 1 = C#; etc.)
  a: 0,
  w: 1,
  s: 2,
  e: 3,
  d: 4,
  f: 5,
  t: 6,
  g: 7,
  y: 8,
  h: 9,
  u: 10,
  j: 11,
  k: 12,
  o: 13,
  l: 14,
  p: 15,
  ò: 16,
  à: 17,
  '+': 18,
  ù: 19
};

/** ///////////////////////////////////////////////////////////////////////
  * GLOBAL VARIABLES
    * definition
    * initialization
* /////////////////////////////////////////////////////////////////////// */

let octave = INITIAL_OCTAVE;
let attack = INITIAL_A_TIME;
let sustain = INITIAL_S_GAIN;
let release = INITIAL_R_TIME;
let maxPartials = MAX_PARTIAL;
let currentMasterGain = INITIAL_MASTER_GAIN;

/** ///////////////////////////////////////////////////////////////////////
  * AUDIO CONTEXT
    * creation of the audio context
    * defining some WEB AUDIO API nodes
    * connect the nodes
* /////////////////////////////////////////////////////////////////////// */

const audioContext = new AudioContext(); // create the audio context
audioContext.suspend(); // suspend the audio context
reverbjs.extend(audioContext); // for using the library reverb.js (it extends the audioContext);
const MAX_FREQ = audioContext.sampleRate/2; // a constant defining the SR/2, for the sonogram visualization

/**
 * GAIN NODES
 */
const masterGain = audioContext.createGain(); // a Gain Node for the MASTER
const asrGain = audioContext.createGain(); // a Gain node for the ASR envelope
const dryGain = audioContext.createGain(); // a Gain node for the DRY signal (no filter applied)
const wetGain = audioContext.createGain(); // a Gain node for the WET signal (with filter)
const revGain = audioContext.createGain(); // a Gain node for the WET signal (with reverb)

masterGain.gain.setValueAtTime(0, audioContext.currentTime); // set the initial vlaue of the MASTER Gain
asrGain.gain.setValueAtTime(1, audioContext.currentTime); // set the initial vlaue of the ASR Gain
dryGain.gain.setValueAtTime(1, audioContext.currentTime); // set the initial vlaue of the DRY Gain
wetGain.gain.setValueAtTime(0, audioContext.currentTime); // set the initial vlaue of the WET Gain
revGain.gain.setValueAtTime(0, audioContext.currentTime); // set the initial vlaue of the REV Gain

/**
 * FILTER NODE
*/
const biquadFilter = audioContext.createBiquadFilter(); // create a BiquadFilterNode
biquadFilter.type = "lowpass"; // set the defaul type
biquadFilter.frequency.setValueAtTime(INITIAL_CUT_OFF, audioContext.currentTime); // set default cutOff frequency
biquadFilter.Q.setValueAtTime(INITIAL_Q, audioContext.currentTime); // set default Q value

/**
 * REVERB NODE
*/
const reverbNode = audioContext.createReverbFromUrl(REV_URL, function() { // create and connect a reverb Node
  reverbNode.connect(revGain);
});

/**
 * MAKE CONNECTIONS
*/
dryGain.connect(asrGain);
wetGain.connect(biquadFilter);
biquadFilter.connect(asrGain);
asrGain.connect(masterGain);
asrGain.connect(reverbNode);
reverbNode.connect(revGain);
revGain.connect(masterGain);
masterGain.connect(audioContext.destination);


/** ///////////////////////////////////////////////////////////////////////
  * GENERAL SUPPORT FUNCTIONS DEFINITION
* /////////////////////////////////////////////////////////////////////// */

/**
 * calculate the frequency in Hz using f = fund * i^t
 * fund = fundamental Hz; i = harmonic index; t = tension value (exponential)
 * used both in the Voice class and in the Partial class
*/
function calcPartialHz(fundHz, index, tension){
  return fundHz*Math.pow(index,tension);
}

function noteToFreq(note) { // convert a MIDI note in Hz
  return 440 * Math.pow(2, (note-69)/12);
}

function activateFilter(filterOn){
  if(filterOn){ // crossfade between the dryGain and the wetGain
      dryGain.gain.setTargetAtTime(0.0, audioContext.currentTime, 0.05); 
      wetGain.gain.setTargetAtTime(1.0, audioContext.currentTime, 0.05);
  } else { // crossfade between the wetGain and the dryGain
      dryGain.gain.setTargetAtTime(1.0, audioContext.currentTime, 0.05);
      wetGain.gain.setTargetAtTime(0.0, audioContext.currentTime, 0.05);
  }
}

function suspendContext(){
  audioContext.suspend(); // suspend the audioContext
}

function startStop(start){
  if(start && audioContext.state == 'suspended'){
    audioContext.resume(); // resume the audiocontext
    masterGain.gain.cancelAndHoldAtTime(audioContext.currentTime); // cancel and hold the scheduled changes in the parameter
    masterGain.gain.setTargetAtTime(currentMasterGain, audioContext.currentTime, 0.02); // fade in of the master
  } else if(!start && audioContext.state == 'running') {
    masterGain.gain.cancelAndHoldAtTime(audioContext.currentTime); // cancel and hold the scheduled changes in the parameter
    masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.02); // fade out of the master
    setTimeout(suspendContext, 600); // suspend the context after 600 ms
  }
}

function changeFilterQ(q){
  biquadFilter.Q.setTargetAtTime(q, audioContext.currentTime, 0.01); // change the filter Q param
}

function changeKeyMode(v){
  if(v=='legato'){
      asrGain.gain.cancelAndHoldAtTime(audioContext.currentTime); // cancel and hold the scheduled changes in the parameter
      asrGain.gain.setTargetAtTime(1, audioContext.currentTime, 0.1); // legato means that the asrGain is always at 1
  } else if(v=='asr'){
      asrGain.gain.cancelAndHoldAtTime(audioContext.currentTime); // cancel and hold the scheduled changes in the parameter
      asrGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.1); // asr means that the asrGain is controlled by the playWithASR function, so here is set at 0
  }
}

function playWithASR(play){
  if(play){ // if click on the piano keyboard or on the correct keys of the KEY_MAP
      asrGain.gain.cancelAndHoldAtTime(audioContext.currentTime); // cancel and hold the scheduled changes in the parameter
      asrGain.gain.setTargetAtTime(sustain, audioContext.currentTime, attack); // go to the sustain value using the attack parameter
  } else {
      asrGain.gain.cancelAndHoldAtTime(audioContext.currentTime); // cancel and hold the scheduled changes in the parameter
      asrGain.gain.setTargetAtTime(0, audioContext.currentTime, release); // go to 0 using the release parameter
  }
}

/** ///////////////////////////////////////////////////////////////////////
  * INSTANCE NEW
    * create a new instance of Voice
* /////////////////////////////////////////////////////////////////////// */

const synth = new Voice( // create an instance (a "voice") of the AdessoSynth class with the constructor
  INITIAL_FREQ, 
  INITIAL_MOD_FM_FREQ, 
  INITIAL_MOD_INDEX, 
  INITIAL_PARTIALS, 
  INITIAL_TENSION, 
  INITIAL_TILT
); 
