class Voice {

  constructor(fundHz, modFMFreq, modIndex, nOfRequiredPartials, tension, tilt){ 
    
    this.arrayOfPartials = []; // array of partials _ contains always the effective playing partials
    this.fundHz = fundHz; // fundamental frequency
    this.nOfRequiredPartials = nOfRequiredPartials; // number of required partials, can be == or != to the Effective partials
    this.tension = tension; // parameter tension [0, 2]
    this.tilt = tilt; // spectral tilt
    this.nOfEffectivePartials = this.calcNumberOfEffectivePartials(this.fundHz, this.nOfRequiredPartials, this.tension);
    
    this.voiceGain = audioContext.createGain(); // create the gain node for the partial
    this.voiceGain.gain.value=1; // set initial gain
    this.voiceGain.connect(dryGain); // connect the voice gain to the dryGain
    this.voiceGain.connect(wetGain); // connect the voice gain to the wetGain

    // create the instances of the Effective Partials
    for(let i = 0; i <  this.nOfEffectivePartials; i++){
      this.arrayOfPartials[i] = new Partial(i, this);
    }

    this.modFMFreq = modFMFreq; // modulation frequency
    this.modulatorFM = audioContext.createOscillator(); // create FM oscillator 
    this.modulatorFM.type = "sine"; // definte the type sinusoid
    this.modulatorFM.frequency.setValueAtTime(this.modFMFreq, audioContext.currentTime); // set initial frequency
    this.modulatorFM.start(audioContext.currentTime); // start the FM oscillator

    this.modIndex = modIndex; // index of modulation
    this.indexOfModGain = audioContext.createGain(); // create a gain node for the FM
    this.indexOfModGain.gain.setValueAtTime(this.modIndex, audioContext.currentTime); // set initial FM index

    this.modulatorFM.connect(this.indexOfModGain); // connect the FM oscillator to the indexOfModGain
    this.connectionsForFM(); 
  }

  calcNumberOfEffectivePartials(fundHz, nOfRequiredPartials, tension){
    let nOfEffectivePartials = nOfRequiredPartials;
    for(let i = nOfRequiredPartials; i >= 0; i--){
      if(calcPartialHz(fundHz, i, tension) <= MAX_FREQ){
        nOfEffectivePartials = i;
        break;
      }
    }
    return nOfEffectivePartials;
  }

  connectionsForFM(){ // apply the FM to each partial in the Array
        for(let i = 0; i <  this.arrayOfPartials.length; i++){
          this.indexOfModGain.connect(this.arrayOfPartials[i].partialOsc.frequency);
        }
  }

  changeIndexOfModulation(i){
    this.modIndex = i;
    this.indexOfModGain.gain.setTargetAtTime(this.modIndex, audioContext.currentTime, 0.1);
  } 

  changeFMmodFreq(f){
    this.modFMFreq = f;
    this.modulatorFM.frequency.setTargetAtTime(this.modFMFreq , audioContext.currentTime, 0.1);
  } 

  createNewPartial(index){ // create a new Partial  
    this.arrayOfPartials[index] = new Partial(index,this);
    this.connectionsForFM();
  }

  stopPartial(partial){ // fade out and stop the partial
    partial.partialGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + PARTIAL_RELEASE_TIME);
    partial.partialOsc.stop(audioContext.currentTime+PARTIAL_RELEASE_TIME);
  }

  changePartialNumber(newNumberOfRequiredPartials){
   
      this.nOfRequiredPartials = newNumberOfRequiredPartials; // update number of required partials
      let arrayLength =  this.arrayOfPartials.length; // length of actual Array (number of actual playing partials)
      this.nOfEffectivePartials = this.calcNumberOfEffectivePartials(this.fundHz, this.nOfRequiredPartials, this.tension); // update the number of effective partials

      if(this.nOfEffectivePartials < arrayLength){ // if number of effective partials is minor than actual playing partials
        for(let i = 0; i < this.nOfEffectivePartials; i++){ // update the amplitude of the remaining partials
            this.arrayOfPartials[i].setPartialAmplitude();
        } 
        for(let i = arrayLength; i > this.nOfEffectivePartials; i-- ){ // remove from the array the partials not needed 
          let partialDeleted = this.arrayOfPartials.pop(); // create a variable with the removed partial
          this.stopPartial(partialDeleted); // stop (with fade out) the removed partial 
        }
      } else if (this.nOfEffectivePartials > arrayLength){ // if number of effective partials is major than actual playing partials
        for(let i = 0; i < this.nOfEffectivePartials; i++){
          if(i < arrayLength){ // update the amplitude of the existing partials
            this.arrayOfPartials[i].setPartialAmplitude();
          } else {
            this.createNewPartial(i); // create the new partials needed
          }   
        }
      }
  }

  changePartialFreq(){
    let arrayLength =  this.arrayOfPartials.length; // length of actual Array (number of actual playing partials)
    this.nOfEffectivePartials = this.calcNumberOfEffectivePartials(this.fundHz, this.nOfRequiredPartials, this.tension); // update the number of effective partials
          
    if(this.nOfEffectivePartials < arrayLength){  // if number of effective partials is minor than actual playing partials
      for(let i = 0; i<this.nOfEffectivePartials; i++){ // update the frequency of the remaining partials
        this.arrayOfPartials[i].setPartialFrequency();  
      } 
      for(let i = arrayLength; i > this.nOfEffectivePartials; i-- ){ // remove from the array the partials not needed 
        let partialDeleted = this.arrayOfPartials.pop(); // create a variable with the removed partial
        this.stopPartial(partialDeleted); // stop (with fade out) the removed partial 
      }
    } else if (this.nOfEffectivePartials >= arrayLength){ // if number of effective partials is major or equal than actual playing partials
      for(let i = 0; i < this.nOfEffectivePartials; i++){
        if(i < arrayLength){ // update the frequency of the existing partials
          this.arrayOfPartials[i].setPartialFrequency();
        } else {
          this.createNewPartial(i); // create the new partials needed
        }   
      }
    }
  }

  changeFundHz(fundHz){
    this.fundHz=fundHz;
    this.changePartialFreq();
  }

  changeTension(tension){
    this.tension = tension;
    this.changePartialFreq();
  }

  changeTilt(tilt){
    this.tilt = tilt;
    for(let i =0; i<this.arrayOfPartials.length; i++){
      this.arrayOfPartials[i].setPartialAmplitude();
    }
  }
}