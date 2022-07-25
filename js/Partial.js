
// CLASS Partial 
class Partial {

    /** CONSTRUCTOR */
    constructor(arrayIndex, parentSynth){ // arrayIndex start from 0 (is the index of an array)
      this.parentSynth = parentSynth; // the parent synth (form which I use: fund, nOfEffective artials, tension, tilt )
      this.partialIndex = arrayIndex+1; // index of the partial (starting from 1 = fundamental)
      this.nOfPartials = this.parentSynth.nOfEffectivePartials;
      this.fundHz = this.parentSynth.fundHz;
      this.tension = this.parentSynth.tension;
      this.tilt = this.parentSynth.tilt;

      // partial frequency in Hz - different for each partial
      this.partialFreqHz = calcPartialHz(this.fundHz, this.partialIndex, this.tension);  

      // calculate the partial Amplitude using both the "tilt parameter" and a gainCorrection based on the number of partials
      this.partialAmplitude = this.calcPartialAmplitude( this.partialIndex, this.tilt) * this.calcGainCorrection( this.nOfPartials); // * Math.pow( this.partialIndex, 0.3 );  // partial amplitude
      
      // the sinusoid
      this.partialOsc = audioContext.createOscillator(); // create the oscillator for the partial
      this.partialOsc.type = "sine"; // definte the type sinusoid
      this.partialOsc.frequency.setValueAtTime(this.partialFreqHz, audioContext.currentTime);
      // start the oscillator
      this.partialOsc.start(audioContext.currentTime);

      // the gain
      this.partialGain = audioContext.createGain(); // create the gain node for the partial
      this.partialGain.gain.value=0;

      // the connections
      this.partialOsc.connect(this.partialGain);
      this.partialGain.connect(this.parentSynth.voiceGain);
      this.partialGain.gain.setTargetAtTime(this.partialAmplitude, audioContext.currentTime, PARTIAL_ATTACK_TIME);
    }
  
    /** METHODS */
    // un unico metodo da usare quando cambia il numero di parziali (gain correction) o quando cambia la tilt
    setPartialAmplitude(){
      this.nOfPartials = this.parentSynth.nOfEffectivePartials;
      this.tilt = this.parentSynth.tilt;
      this.partialAmplitude = this.calcPartialAmplitude(this.partialIndex, this.tilt) * this.calcGainCorrection(this.nOfPartials);// * Math.pow( this.partialIndex, 0.3 );  // partial amplitude
      this.partialGain.gain.cancelAndHoldAtTime(audioContext.currentTime);     
      this.partialGain.gain.setTargetAtTime(this.partialAmplitude, audioContext.currentTime, PARTIAL_ATTACK_TIME);
    }

    calcGainCorrection(nOfPartials){
      return 1/(Math.pow(Math.sqrt(nOfPartials),0.3));
      // return 1/nOfPartials;
    }
    
    calcPartialAmplitude(index, tilt){
      return 1/(Math.pow(index, tilt)); 
    }

    // un unico metodo da usare quando cambia la fondamentale o quando cambia la tensione
    setPartialFrequency(){
      this.fundHz = this.parentSynth.fundHz;
      this.tension = this.parentSynth.tension;
      this.partialFreqHz = calcPartialHz( this.fundHz, this.partialIndex, this.tension);
      this.partialOsc.frequency.setValueAtTime(this.partialFreqHz, audioContext.currentTime);
    }
  }