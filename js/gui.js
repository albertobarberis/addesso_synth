/** ///////////////////////////////////////////////////////////////////////
 * WEB AUDIO WORKSHOP
    * AddEsso Synth
    * Author Alberto Barberis (www.albertobarberis.it)
    * January 2021

 * gui.js :
    * creation of the GUI objects
    * creation of the Event Handler of GUI objects
*/

/** ///////////////////////////////////////////////////////////////////////
  * CREATE THE GUI OBJECTS
* /////////////////////////////////////////////////////////////////////// */

// funzione che viene invocata quando il body è stato completamente caricato
document.body.onload = createGui;

function createGui(){

    Nexus.colors.accent = '#ff0'; // general accent color for the Nexus Gui objects
    Nexus.colors.fill = '#333'; // general fill color for the Nexus Gui objects
  
    /**
     * ON/OFF 
        * Toggle
    */
    let onOfftoggle = new Nexus.Toggle('#onOff',{
      'size': [80,40],
      'state': false
    });
    onOfftoggle.on('change',function(v) {
      startStop(v);
    });
    
    /**
     * MASTER GAIN 
        * Slider
    */
    let gainSlider =  new Nexus.Slider('#masterGain',{
      'size': [200,40],
      'mode': 'relative',  // 'relative' or 'absolute'
      'min': 0,
      'max': 1,
      'step': 0.01,
      'value': 1
    });
    gainSlider.on('change',function(v) {
      let g = Nexus.scale(Math.pow(v,1.66), 0, 1, 0.0, 0.1); 
      currentMasterGain = g;
      masterGain.gain.cancelAndHoldAtTime(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(currentMasterGain, audioContext.currentTime, 0.02);
    });
  
    /**
     * LEGATO 
        * Select (between legato or asr)
    */
    let legato = new Nexus.Select('#legato',{
      'size': [80,30],
      'options': ['legato','asr'],
    });
    legato.colorize("fill","#ff0");
    legato.on('change',function(v) {
      changeKeyMode(v.value);
    });
  
    /**
     * PIANO KEYBOARD 
        * Piano
    */
    let piano = new Nexus.Piano('#piano',{
      'size': [500,125],
      'mode': 'button',  // 'button', 'toggle', or 'impulse'
      'lowNote': LOW_KEYBOARD_MIDI,
      'highNote': HIGH_KEYBOARD_MIDI
    });
    let currentMIDInote;
    piano.on('change',function(v) {
      let MIDInoteInRightOctave = v.note + (12*octave);
      if(v.state && MIDInoteInRightOctave != currentMIDInote){
        let noteInHz = noteToFreq(MIDInoteInRightOctave);
        synth.changeFundHz(noteInHz);
        currentMIDInote = MIDInoteInRightOctave;
      } 
      if(legato.value == 'asr'){ // play with ASR if we are in ASR mode
        playWithASR(v.state);
      }
    });

    /**
     * SELECT OCTAVE 
         * Select
    */
    let selectOctave = new Nexus.Select('#ottava',{
        'size': [60,30],
        'options': ['1-2','2-3','3-4','4-5','5-6','6-7']
    });
    selectOctave.value='3-4';
    selectOctave.colorize('fill','#ff0');
    selectOctave.on('change',function(v) {
      octave = selectOctave.selectedIndex+1;
    });

    /**
     * PC KEYBOARD
        * using the standard keydown and keyup events
    */
    let keyIsPressed = false;
    let currentLetterPressed = undefined;
    
    document.addEventListener('keydown', function(event) {
      let letter = event.key;
      let pressedPitchIndex = KEY_MAP[letter];
      if( letter != currentLetterPressed && pressedPitchIndex != undefined && !keyIsPressed ){ 
          let notePressed = pressedPitchIndex + LOW_KEYBOARD_MIDI;
          piano.toggleKey(notePressed, 1); // press the MIDI note on the Piano keyboard gui
          currentLetterPressed = letter;
          keyIsPressed = true;
      }
    });
    document.addEventListener('keyup', function(event) {
      let letter = event.key;
      let releasedPitchIndex = KEY_MAP[letter];
      if( letter == currentLetterPressed && keyIsPressed ){
          let noteReleased = releasedPitchIndex+ LOW_KEYBOARD_MIDI;
          piano.toggleKey(noteReleased, 0);
          currentLetterPressed = undefined;
          keyIsPressed = false;
      }
    });

    /**
     * PARTIALS 
        * input html element for displaying the number of partials
        * Dial for the input of the partials number
        * Number for the maximum partial number
    */
    let number = document.getElementById('number');
    number.value = MIN_PARTIAL;
    
    let dialPartial = new Nexus.Dial('#dialPartial',{
        'size': [300,300],
        'interaction': 'radial', // "radial", "vertical", or "horizontal"
        'mode': 'relative', // "absolute" or "relative"
        'min': 0.,
        'max': 1.,
        'step': 0.005,
        'value': 0.1
    });
    let lastPartialNumber = INITIAL_PARTIALS; // flag for check if the number is changing
    dialPartial.on('change',function(v) {
      let partials = Math.floor(Nexus.scale(Math.pow(v,4), 0, 1, MIN_PARTIAL, maxPartials)); 
      if(partials!=lastPartialNumber){
        synth.changePartialNumber(partials);
        number.value=partials;
        lastPartialNumber=partials;
      }  
    }); 
    let maxPartialsNumber = new Nexus.Number('#maxPartials',{
      'size': [40,30],
      'value': MAX_PARTIAL,
      'min': MIN_PARTIAL,
      'max': MAX_PARTIAL,
      'step': 1
    });
    maxPartialsNumber.colorize('fill','#808080');
    maxPartialsNumber.on('change',function(v) {
      maxPartials = v;
    });
  
    /**
     * TENSION
        * Dial for the tension amount
        * button for the "reset" at the initial value
    */
    let dialTension = new Nexus.Dial('#dialTension',{
      'size': [150,150],
      'interaction': 'radial', // "radial", "vertical", or "horizontal"
      'mode': 'relative', // "absolute" or "relative"
      'min': MIN_TENSION,
      'max': MAX_TENSION, 
      'step': 0.01,
      'value': INITIAL_TENSION
    });
    let lastTension = INITIAL_TENSION;
    dialTension.on('change',function(tension) {
      if(tension!=lastTension){
        synth.changeTension(tension);
        lastTension=tension;
      }  
    }); 
    let buttonTension = new Nexus.Button('#buttonTension',{
      'size': [20,20],
      'mode': 'button',
      'state': false
    });
    buttonTension.on('change',function(v) {
      if(v){
        dialTension.value=INITIAL_TENSION;
      }
    });
   
    /**
     * SPECTRAL TILT
        * Dial for the tilt amount
        * button for the "reset" at the initial value
    */
    let dialTilt = new Nexus.Dial('#dialTilt',{
      'size': [150,150],
      'interaction': 'radial', // "radial", "vertical", or "horizontal"
      'mode': 'relative', // "absolute" or "relative"
      'min': 0.0,
      'max': 1.0,
      'step': 0.05,
      'value': 0.5
    });
    let lastTilt = INITIAL_TILT;
    dialTilt.on('change',function(v) {
        let tilt = Nexus.scale(v, 0, 1, MAX_TILT, MIN_TILT); 
        if(tilt!=lastTilt){
          synth.changeTilt(tilt);
          lastTilt=tilt;
        }  
    }); 
    let buttonTilt = new Nexus.Button('#buttonTilt',{
      'size': [20,20],
      'mode': 'button',
      'state': false
    });
    buttonTilt.on('change',function(v) {
      if(v){
        dialTilt.value = Nexus.scale(INITIAL_TILT, MAX_TILT, MIN_TILT, 0, 1);
      }
    });
  
    /**
     * ASR
        * Dial for attack "time"
        * Dial for Sustain Gain
        * Dial for release "time"
    */
    let dialA = new Nexus.Dial('#dialA',{
      'size': [50,50],
      'interaction': 'radial', // "radial", "vertical", or "horizontal"
      'mode': 'relative', // "absolute" or "relative"
      'min': 0,
      'max': 1,
      'step': 0.01,
      'value': INITIAL_A_TIME
    });
    dialA.on('change',function(v) {
      let a = Nexus.scale(Math.pow(v,3), 0, 1, MIN_A_TIME, MAX_A_TIME); 
      attack = a;
    }); 
    let dialS = new Nexus.Dial('#dialS',{
      'size': [50,50],
      'interaction': 'radial', // "radial", "vertical", or "horizontal"
      'mode': 'relative', // "absolute" or "relative"
      'min': 0,
      'max': 1,
      'step': 0.01,
      'value': INITIAL_S_GAIN
    });
    dialS.on('change',function(v) {
      let s = Nexus.scale(Math.pow(v,1.66), 0, 1, MIN_S_GAIN, MAX_S_GAIN); 
      sustain = s;
    }); 
    let dialR = new Nexus.Dial('#dialR',{
      'size': [50,50],
      'interaction': 'radial', // "radial", "vertical", or "horizontal"
      'mode': 'relative', // "absolute" or "relative"
      'min': 0,
      'max': 1,
      'step': 0.01,
      'value': INITIAL_R_TIME
    });
    dialR.on('change',function(v) {
      let d = Nexus.scale(Math.pow(v,2), 0, 1, MIN_R_TIME, MAX_R_TIME); 
      release =d;
    }); 
  
    /**
     * SPECTROGRAM
        * Spectrogram connected to the final masterGain
    */
    let spectrogram = new Nexus.Spectrogram('#spectrum',{
        'size': [350,125]
    });
    spectrogram.connect(masterGain);
    spectrogram.colorize('fill','#808080');
  
    /**
     * BIQUAD FILTER
        * Toggle for activate or deactivate the filter
        * Select for the filter mode
        * Dial for the Cut OFf frequency 
        * Button for the "reset" at the initial value
        * Number for the input the Q amount of the filter
    */
   let toggleFilter = new Nexus.Toggle('#toggleFilter',{
    'size': [70,22],
    'state': false
    });
    toggleFilter.on('change',function(v) {
        activateFilter(v);
    });
    let filter = new Nexus.Select('#filter',{
      'size': [100,30],
      'options': ['lowpass','highpass','bandpass', 'notch']
    });
    filter.colorize("fill","#ff0");
    filter.on('change',function(v) {
      biquadFilter.type = v.value;
    });
    let dialCutOff = new Nexus.Dial('#dialCutOff',{
      'size': [100,100],
      'interaction': 'radial', // "radial", "vertical", or "horizontal"
      'mode': 'relative', // "absolute" or "relative"
      'min': 0.0,
      'max': 1.0, 
      'step': 0.01,
      'value': INITIAL_CUT_OFF_DIAL
    });
    dialCutOff.on('change',function(f) {
      let cutOff = Nexus.scale(Math.pow(f,4), 0, 1, 20, 20000); 
      biquadFilter.frequency.setTargetAtTime(cutOff, audioContext.currentTime, 0.01);
    }); 
    let buttonCutOff = new Nexus.Button('#buttonCutOff',{
      'size': [20,20],
      'mode': 'aftertouch',
      'state': false
    });
    buttonCutOff.on('change',function(v) {
      dialCutOff.value = INITIAL_CUT_OFF_DIAL;
    });
    let numberQ = new Nexus.Number('#numberQ',{
      'size': [50,30],
      'value': INITIAL_Q,
      'min': 0.0,
      'max': 1.0,
      'step': 0.001
    });
    numberQ.colorize('fill','#808080');
    numberQ.on('change',function(v) {
      changeFilterQ(Nexus.scale(Math.pow(v,4), 0, 1, 0.001, 1000));
    });
  
    /**
     * FM 
        * Dial for the Modulator frequency
        * Button for the "reset" at the initial value
        * Slider for the index of modulation
    */
    let dialFM = new Nexus.Dial('#dialFM',{
      'size': [100,100],
      'interaction': 'radial', // "radial", "vertical", or "horizontal"
      'mode': 'relative', // "absolute" or "relative"
      'min': 0,
      'max': 1, 
      'step': 0.001,
      'value': 0.5
    });
    let previousFMmodulatorFreq=INITIAL_MOD_FM_DIAL;
    dialFM.on('change',function(f) {
      if(f!=previousFMmodulatorFreq){
        let FMmodulatorFreq = Nexus.scale(Math.pow(f,2), 0, 1, MIN_MOD_FM_FREQ, MAX_MOD_FM_FREQ); 
        synth.changeFMmodFreq(FMmodulatorFreq); 
        previousFMmodulatorFreq = f;
      }
    }); 
    let buttonFM = new Nexus.Button('#buttonFM',{
      'size': [20,20],
      'mode': 'aftertouch',
      'state': false
    });
    buttonFM.on('change',function(v) {
      dialFM.value = INITIAL_MOD_FM_DIAL;
    });
    let indexOfModSlider = new Nexus.Slider('#indexOfModulation',{
      'size': [120,20],
      'mode': 'relative',  // 'relative' or 'absolute'
      'min': 0,
      'max': 1,
      'step': 0.001,
      'value': 0
    });
    indexOfModSlider.on('change',function(v) {
      let indexOfModulation = Nexus.scale(Math.pow(v,1.66), 0, 1, 0, MAX_INDEX_OF_MODULATION); 
      synth.changeIndexOfModulation(indexOfModulation); 
    });
  
    /**
     * REVERB 
        * Slider for the reverb amount
    */
    let reverbAmount = new Nexus.Slider('#reverbAmount',{
      'size': [120,20],
      'mode': 'relative',  // 'relative' or 'absolute'
      'min': 0,
      'max': 1,
      'step': 0.001,
      'value': 0
    });
    reverbAmount.on('change',function(v) {
      let a = Math.pow(v,1.66); 
      revGain.gain.setTargetAtTime(a, audioContext.currentTime, 0.1);
    });
  }

