/*
The MIT License (MIT)

Copyright (c) 2014 Sébastien Mischler (skarab)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function (window) {
    // ------------------------------------------------------------------------
    // globals
    // ------------------------------------------------------------------------
    var version   = '1.0'; // Looper version
    var instance  = null;  // Looper instance (singleton)
    var context   = null;  // global audio context
    var metronome = null;  // Metronome instance (singleton)
    var recorder  = null;  // Recorder instance (singleton)
    var loops     = null;  // Loops instance (singleton)
    var tuna      = null;  // Tuna instance
    var uid       = 0;     // global unique id

    // ------------------------------------------------------------------------
    // impules files list
    // ------------------------------------------------------------------------
    var FILTERS_IMPULSES = [
        'Block Inside',
        'Bottle Hall',
        'Cement Blocks 1',
        'Cement Blocks 2',
        'Chateau de Logne, Outside',
        'Conic Long Echo Hall',
        'Deep Space',
        'Derlon Sanctuary',
        'Direct Cabinet N1',
        'Direct Cabinet N2',
        'Direct Cabinet N3',
        'Direct Cabinet N4',
        'Five Columns Long',
        'Five Columns',
        'French 18th Century Salon',
        'Going Home',
        'Greek 7 Echo Hall',
        'Highly Damped Large Room',
        'In The Silo Revised',
        'In The Silo',
        'Large Bottle Hall',
        'Large Long Echo Hall',
        'Large Wide Echo Hall',
        'Masonic Lodge',
        'Musikvereinsaal',
        'Narrow Bumpy Space',
        'Nice Drum Room',
        'On a Star',
        'Parking Garage',
        'Rays',
        'Right Glass Triangle',
        'Ruby Room',
        'Scala Milan Opera Hall',
        'Small Drum Room',
        'Small Prehistoric Cave',
        'St Nicolaes Church',
        'Sweetspot1M',
        'Trig Room',
        'Vocal Duo',
        'impulse_guitar',
        'impulse_rev',
        'ir_rev_short'
    ];

    // ------------------------------------------------------------------------
    // Looper (namespace | singleton)
    // ------------------------------------------------------------------------
    function Looper(userContext) {
        // singleton
        if (instance) {
            return instance;
        }

        // force object instantiation
        if(! (this instanceof Looper)) {
            return new Looper(userContext);
        }

        // instance
        instance = this;

        // global audio context
        if (userContext) {
            context = userContext;
        }
        else {
            if (! window.AudioContext) {
                window.AudioContext = window.webkitAudioContext;
            }

            if (! window.AudioContext) {
                throw new Error('looper.js : AudioContext not supported');
            }

            context = new window.AudioContext();
        }
    };

    // return the Looper version
    Looper.prototype.getVersion = function() {
        return version;
    };
    
    // return the Looper instance (singleton)
    Looper.prototype.getInstance = function() {
        return instance;
    };

    // return the global audio context
    Looper.prototype.getContext = function() {
        return context;
    };

    // return a new uid
    Looper.prototype.uid = function() {
        return uid++;
    };

    // return the impulses file name liste
    Looper.prototype.getFiltersImpulses = function() {
        return FILTERS_IMPULSES;
    };

    // return the Tuna.js filters list
    Looper.prototype.getFilters = function() {
        return tuna.getFilters();
    };

    // ------------------------------------------------------------------------
    
    // find source
    Looper.prototype.findSource = function(source) {
        return source.output || source;
    };
    
    // find destination
    Looper.prototype.findDestination = function(destination) {
        return destination.input || destination.destination || destination;
    };
    
    // connect source to destination
    Looper.prototype.connect = function(source, destination) {
        this.findSource(source).connect(this.findDestination(destination));
    };

    // disconnect source from destination
    Looper.prototype.disconnect = function(source, destination) {
        this.findSource(source).disconnect(this.findDestination(destination));
    };

    // set gain on source
    Looper.prototype.setGain = function(source, value, time) {
        if (time) {
            source.gain.setValueAtTime(value, time);
        } 
        else
        {
            source.gain.value = value;
        }
    };
    
    // ------------------------------------------------------------------------
    
    // user media
    Looper.prototype.getUserMedia = function(constraints, success, error) {
        // defined
        if (! navigator.getUserMedia) {
            // normalize
            navigator.getUserMedia = (navigator.getUserMedia       ||
                                      navigator.webkitGetUserMedia ||
                                      navigator.mozGetUserMedia    ||
                                      navigator.msGetUserMedia     ||
                                      null);

            // if not defined
            if (! navigator.getUserMedia) {
                throw new Error('getUserMedia not supported');
            }
        }

        // aliasing
        navigator.getUserMedia(constraints, success, error);
    };
    
    // user media
    Looper.prototype.getMicrophone = function(success, error) {
        instance.getUserMedia({audio: true}, success, error);
    };
    
    // ------------------------------------------------------------------------

    // return a stereo microphone node from stream
    Looper.prototype.microphone = function(stream) {
        return instance.toStereo(context.createMediaStreamSource(stream));
    };

    // ------------------------------------------------------------------------

    // convert (force) to stereo
    Looper.prototype.toStereo = function(node) {
        var splitter = context.createChannelSplitter(2);
        var merger   = context.createChannelMerger(2);

        node.connect(splitter);
        splitter.connect(merger, 0, 0);
        splitter.connect(merger, 0, 1);

        return merger;
    };

    // ------------------------------------------------------------------------
    // filters chain
    // ------------------------------------------------------------------------
    Looper.prototype.Filters = function() {
        // tuna init (once)
        if (! tuna) {
            tuna = new Tuna(context);
        }

        // unique id
        this.id = instance.uid();

        // filters chain
        this.filters = [];

        // input / output
        this.input  = context.createGain();
        this.output = context.createGain();

        // connect input to output
        this.input.connect(this.output);
    };

    // ------------------------------------------------------------------------
    
    // connect / disconnect
    Looper.prototype.Filters.prototype.connect = function(destination) {
        instance.connect(this, destination);
    };

    Looper.prototype.Filters.prototype.disconnect = function(destination) {
        instance.disconnect(this, destination);
    };
    
    // attach (connect) source
    Looper.prototype.Filters.prototype.attach = function(source) {
        instance.connect(source, this);
    };

    // detach (disconnect) source
    Looper.prototype.Filters.prototype.detach = function(source) {
        instance.disconnect(source, this);
    };

    // ------------------------------------------------------------------------
    
    // get filter
    Looper.prototype.Filters.prototype.getFilter = function(id) {
        if (this.filters[id]) {
            return this.filters[id].filter;
        }

        return null;
    };

    Looper.prototype.Filters.prototype.getLastFilter = function() {
        return this.getFilter(this.filters.length - 1);
    };

    // get filter position
    Looper.prototype.Filters.prototype.getFilterPosition = function(filter) {
        // for each filters
        for (var id in this.filters) {
            // this is the target -> return
            if (this.filters[id].id == filter.id) {
                return parseInt(id);
            }
        }

        // not found
        return null;
    }

    // ------------------------------------------------------------------------
    
    // add filter
    Looper.prototype.Filters.prototype.add = function(name, params) {
        // get last filter
        var lastFilter = this.getLastFilter() || this.input;

        // create filter
        var filter = new tuna[name](params || {});

        // disconnect last filter or input
        //lastFilter.disconnect(this.output);
        instance.disconnect(lastFilter, this.output);

        // connect last filter to the new one
        //lastFilter.connect(filter.input);
        instance.connect(lastFilter, filter);

        // and finaly connect the new filter to output
        //filter.connect(this.output);
        instance.connect(filter, this.output);
        
        // filter id
        var id = instance.uid();

        // filter object
        var filterObject = {
            id     : id,
            name   : name,
            params : params,
            filter : filter
        };

        // add filter in the liste
        this.filters.push(filterObject);

        // return the filter object
        return filterObject;
    };

    // remove filter
    Looper.prototype.Filters.prototype.remove = function(filterObject) {
        // get filter position
        var filterPosition = this.getFilterPosition(filterObject);
        
        // input and output
        var input  = this.getFilter(filterPosition - 1) || this.input;
        var output = this.getFilter(filterPosition + 1) || this.output;

        // disconnect filter
        //input.disconnect(filterObject.filter.input);
        instance.disconnect(input, filterObject.filter);
        //filterObject.filter.disconnect(output.input || output);
        instance.disconnect(filterObject.filter, output);
        
        // remove filter from list
        this.filters.splice(filterPosition, 1);

        // connect input to output
        //input.connect(output.input || output);
        instance.connect(input, output);
    };

    // ------------------------------------------------------------------------
    // Looper AudioGraph
    // ------------------------------------------------------------------------
    Looper.prototype.AudioGraph = function(settings) {
        // user settings
        this.configure(settings);

        // unique id
        this.id = instance.uid();

        // defaults
        this.activated        = false;
        this.filtersActivated = false;
        this.muted            = false;
        this.lastGain         = 1;

        // base nodes for all audio module
        this.input       = context.createGain();
        this.root        = context.createGain();
        this.gain        = context.createGain();
        this.splitter    = context.createChannelSplitter(2);
        this.gainL       = context.createGain();
        this.gainR       = context.createGain();
        this.merger      = context.createChannelMerger(2);
        this.filtersPort = context.createGain();
        this.output      = context.createGain();
        this.filters     = new instance.Filters();

        // audio graph connections
        this.root.connect(this.gain);
        this.gain.connect(this.splitter);
        this.splitter.connect(this.gainL, 0);
        this.splitter.connect(this.gainR, 1);
        this.gainL.connect(this.merger, 0, 0);
        this.gainR.connect(this.merger, 0, 1);
        this.merger.connect(this.filtersPort);
        this.filtersPort.connect(this.output);

        // set defaults settings
        this.setGainL(this.settings.gain.left);
        this.setGainR(this.settings.gain.right);
        this.setGain(this.settings.gain.master);
        this.mute(this.settings.mute);
        this.activate(this.settings.activate);
        this.activateFilters(this.settings.filters.activate);
    };

    // defaults settings
    Looper.prototype.AudioGraph.prototype.defaults = {
        activate : true,
        mute     : false,
        gain     : {
            left   : 1, // [min:0, max:1]
            right  : 1, // [min:0, max:1]
            master : 1  // [min:0, max:1]
        },
        filters : {
            activate : true
        }
    };

    // configuration
    Looper.prototype.AudioGraph.prototype.configure = function(settings) {
        if (this.settings) {
            throw new Error('AudioGraph: allready configured.');
        }

        this.settings = $.extend(true, {}, this.defaults, settings);
    };

    // ------------------------------------------------------------------------
    
    // activate / deactivate audio node
    Looper.prototype.AudioGraph.prototype.activate = function(activate) {
        if (this.activated == activate) {
            return;
        }
        
        this.activated = !!activate;

        this.input.disconnect();
        this.input.connect(activate ? this.root : this.output);
    };
    
    Looper.prototype.AudioGraph.prototype.deactivate = function() {
        this.activate(false);
    };
    
    // ------------------------------------------------------------------------
    
    // bypass filters chain
    Looper.prototype.AudioGraph.prototype.activateFilters = function(activate) {
        if (this.filtersActivated == activate) {
            return;
        }

        this.filtersActivated = !!activate;

        if (activate) {
            this.filtersPort.disconnect(this.output);
            this.filters.attach(this.filtersPort);
            this.filters.connect(this.output);
        }
        else {
            this.filters.disconnect(this.output);
            this.filters.detach(this.filtersPort);
            this.filtersPort.connect(this.output);
        }
    };

    Looper.prototype.AudioGraph.prototype.toggleFilters = function() {
        this.activateFilters(! this.filtersActivated);
    };
    
    // ------------------------------------------------------------------------
    
    // connect destination
    Looper.prototype.AudioGraph.prototype.connect = function(destination) {
        instance.connect(this, destination);
    };

    // disconnect destination
    Looper.prototype.AudioGraph.prototype.disconnect = function(destination) {
        instance.disconnect(this, destination);
    };
    
    // attach (connect) source
    Looper.prototype.AudioGraph.prototype.attach = function(source) {
        instance.connect(source, this);
    };

    // detach (disconnect) source
    Looper.prototype.AudioGraph.prototype.detach = function(source) {
        instance.disconnect(source, this);
    };

    // ------------------------------------------------------------------------
    
    // set / get gain
    Looper.prototype.AudioGraph.prototype.setGain = function(value, time) {
        instance.setGain(this.gain, value, time);
    };

    Looper.prototype.AudioGraph.prototype.getGain = function() {
        return this.gain.gain.value;
    };

    Looper.prototype.AudioGraph.prototype.setGainL = function(value, time) {
        instance.setGain(this.gainL, value, time);
    };

    Looper.prototype.AudioGraph.prototype.getGainL = function() {
        return this.gainL.gain.value;
    };

    Looper.prototype.AudioGraph.prototype.setGainR = function(value, time) {
        instance.setGain(this.gainR, value, time);
    };

    Looper.prototype.AudioGraph.prototype.getGainR = function() {
        return this.gainR.gain.value;
    };

    Looper.prototype.AudioGraph.prototype.setGainLR = function(value, time) {
        this.setGainL(value, time || 0);
        this.setGainR(value, time || 0);
    };

    Looper.prototype.AudioGraph.prototype.getGainLR = function() {
        return {
            left  : this.getGainL(),
            right : this.getGainR()
        }
    };

    // ------------------------------------------------------------------------
    
    // mute / unmute / toggle
    Looper.prototype.AudioGraph.prototype.isMuted = function() {
        return this.muted;
    };

    Looper.prototype.AudioGraph.prototype.mute = function(mute, time) {
        // register last gain values for unmute
        if (mute) {
            this.lastGain = this.getGain();
        }

        // (un)mute
        this.setGain(mute ? 0 : (this.lastGain || 1), time);
            
        // delayed (un)mute (status)
        if (time) {
            window.setTimeout(function() {
                this.muted = !!mute;
            }, time);
        }
        else {
            this.muted = !!mute;
        }
    };

    Looper.prototype.AudioGraph.prototype.unmute = function(time) {
        this.mute(false, time);
    };

    Looper.prototype.AudioGraph.prototype.toggleMute = function(time) {
        this.mute(!this.muted, time);
    };

    // ------------------------------------------------------------------------
    
    // add/remove filter in the chain (tuna.js graph)
    Looper.prototype.AudioGraph.prototype.addFilter = function(name, params) {
        return this.filters.add(name, params);
    };

    Looper.prototype.AudioGraph.prototype.removeFilter = function(id) {
        return this.filters.remove(id);
    };

    // ------------------------------------------------------------------------
    // gain analizer
    // ------------------------------------------------------------------------
    Looper.prototype.GainAnalizer = function(name, processor, settings) {
        // user settings
        this.configure(settings);

        // unique id
        this.id = instance.uid();

        // defaults
        this.name       = name;
        this.processor  = processor;
        this.bufferSize = this.settings.bufferSize;
        this.clipLevel  = this.settings.clipLevel;
        this.clipLag    = this.settings.clipLag;
        this.timeout    = this.settings.timeout;
        this.clipping   = [false, false];
        this.lastClip   = [0, 0];
        this.lastUpdate = 0;

        // analizer
        this.analizer = context.createScriptProcessor(this.bufferSize, 2, 2);
    };

    // defaults settings
    Looper.prototype.GainAnalizer.prototype.defaults = {
        bufferSize : 4096,
        clipLevel  : 0.98,
        clipLag    : 250,
        timeout    : 50
    };

    // configuration
    Looper.prototype.GainAnalizer.prototype.configure = function(settings) {
        if (this.settings) {
            throw new Error('GainAnalizer: allready configured.');
        }

        this.settings = $.extend(true, {}, this.defaults, settings);
    };

    // ------------------------------------------------------------------------
    
    Looper.prototype.GainAnalizer.prototype.attach = function(source) {
        // save scope
        var self = this;
        
        // set audio processor
        this.analizer.onaudioprocess = function(e) {
            self.processor.call(self, self.getData(e.inputBuffer));
        };

        // connect
        instance.connect(source, this.analizer);
        instance.connect(this.analizer, context);
    };

    Looper.prototype.GainAnalizer.prototype.detach = function(source) {
        // remove processor
        this.analizer.onaudioprocess = null;
        
        // disconnect
        instance.disconnect(source, this.analizer);
        instance.disconnect(this.analizer, context);
    };

    // ------------------------------------------------------------------------
    
    // audio proccess callback
    Looper.prototype.GainAnalizer.prototype.audioprocess = function(e) {
        this.processor.call(this, this.getData(e.inputBuffer));
    };

    // gain analizer
    Looper.prototype.GainAnalizer.prototype.analize = function(buffer, id) {
        // data
        var data = buffer.getChannelData(id || 0);

        // total magnitude
        var total = 0;
        var time  = window.performance.now();

        // clipping end
        if ((this.lastClip[id] + this.clipLag) < time) {
            this.clipping[id] = false;
        }

        // for each data in buffer
        for (var i in data) {
            // current absolute value 
            var value = Math.abs(data[i]);

            // is clipping
            if (value >= this.clipLevel) {
                this.clipping[id] = true;
                this.lastClip[id] = time;
            }

            // add value to total
            total += value;
        }

        // rms / db / [pos]ition in percent
        var rms = Math.sqrt(total / data.length);
        var db  = 20 * Math.log(rms) / Math.LN10;
        var pos = (100 - parseInt(Math.abs(db) / (40 / 100))) / 100;

        // return structured values
        return {
            rms      : rms,
            pos      : pos, // percent between 0 - 40 db
            db       : parseInt(db),
            clipping : this.clipping[id]
        };
    };

    // return formatted data and temporize
    Looper.prototype.GainAnalizer.prototype.getData = function(buffer) {
        // time
        var time = window.performance.now();
        
        // timeout
        if ((this.lastUpdate + this.timeout) > time) {
            return null;
        }

        this.lastUpdate = time;

        // return
        return {
            left  : this.analize(buffer, 0),
            right : this.analize(buffer, 1)
        };
    };

    // ------------------------------------------------------------------------
    // Recorder (singleton)
    // ------------------------------------------------------------------------
    Looper.prototype.Recorder = function(source, bufferSize) {
        // singleton
        if (recorder) {
            return recorder;
        }

        // force object instantiation
        if(! (this instanceof instance.Recorder)) {
            return new instance.Recorder(source, bufferSize);
        }

        // instance
        recorder = this;

        // recording status
        this.recording = false;

        // recorder
        this.bufferSize = bufferSize || 4096;

        // recorder
        this.recorder = context.createScriptProcessor(this.bufferSize, 2, 2);

        // connection
        instance.connect(source, this.recorder);
        instance.connect(this.recorder, context);
    };

    // append buffer
    Looper.prototype.Recorder.prototype.appendBuffer = function(b1, b2) 
    {
        var nc  = Math.min(b1.numberOfChannels, b2.numberOfChannels);
        var b3  = (b1.length + b2.length);
        var tmp = context.createBuffer(nc, b3, b1.sampleRate);
        
        for (var i = 0; i < nc; i++) 
        {
            var channel = tmp.getChannelData(i);

            channel.set(b1.getChannelData(i), 0);
            channel.set(b2.getChannelData(i), b1.length);
        }
        
        return tmp;
    };

    // recorder audioprocess callback
    Looper.prototype.Recorder.prototype.onaudioprocess = function(e) {};

    // return if recording
    Looper.prototype.Recorder.prototype.isRecording = function() {
        return this.recording;
    };

    // start/stop recording
    Looper.prototype.Recorder.prototype.start = function() {
        this.recording = true;
        
        // set audio process callback
        this.recorder.onaudioprocess = this.onaudioprocess;
    };

    Looper.prototype.Recorder.prototype.stop = function() {
        this.recording = false;

        // reset audio process callback
        this.recorder.onaudioprocess = null;
    };

    // ------------------------------------------------------------------------
    // Loop
    // ------------------------------------------------------------------------
    Looper.prototype.Loop = function(beats) {
        var metronome = instance.Metronome();

        this.id           = instance.uid();
        this.playing      = false;
        this.recording    = false;
        this.beats        = metronome.beats;
        this.duration     = metronome.beatDuration * this.beats;
        this.tracks       = [];
        this.sheduled     = [];
        this.currentTrack = null;
        this.minDuration  = 0.7;
        this.timer        = null;
        this.locked       = true;
        this.destination  = null;

        beats && this.setBeats(beats);
    }; 

    //set destination
    Looper.prototype.Loop.prototype.setDestination = function(destination) {
        this.destination = destination;
    };

    // return if playing
    Looper.prototype.Loop.prototype.isPlaying = function() {
        return this.playing;
    };

    // return if overdubbing
    Looper.prototype.Loop.prototype.isOverdubbing = function() {
        return this.tracks.length > 1 && this.recording;
    };

    // return if recording
    Looper.prototype.Loop.prototype.isRecording = function() {
        return this.recording;
    };

    // return if recording
    Looper.prototype.Loop.prototype.isLocked = function() {
        return this.locked;
    };

    // return if empty
    Looper.prototype.Loop.prototype.isEmpty = function() {
        return this.tracks.length ? false : true;
    };

    // set beats number
    Looper.prototype.Loop.prototype.setBeats = function(beats) {
        // if recorded do not change beats
        if (! this.isEmpty()) {
            throw new Error('you can not change beats on NO empty loop');
        }

        var metronome = instance.Metronome();
            beats     = parseInt(beats);
        
        // not allowed value
        if (! metronome.allowedBeats(beats)) {
            throw new Error(beats + ' is not a valid beats value');
        }

        this.beats    = beats;
        this.duration = metronome.beatDuration * this.beats;
        
        return this.beats;
    };

    Looper.prototype.Loop.prototype.getCurrentTrack = function() {
        return this.tracks[this.currentTrack] || null;
    };

    Looper.prototype.Loop.prototype.newTrack = function() {
        this.tracks.push(null);
    };

    Looper.prototype.Loop.prototype.incrementTrack = function() {
        this.setCurrentId(this.tracks.length);
        this.newTrack();
    };

    Looper.prototype.Loop.prototype.setCurrentId = function(id) {
        this.currentTrack = id;
    };

    // play loop
    Looper.prototype.Loop.prototype.play = function(time) {
        // for each track
        for (var i in this.tracks)
        {
            // buffer
            var track = this.tracks[i];

            // remove played tracks
            while(this.sheduled.length && this.sheduled[0].time < context.currentTime - 0.1) 
            {
                this.sheduled.splice(0, 1);
            }

            // track not null
            if (track !== null)
            {
                var sound    = context.createBufferSource();
                sound.buffer = track;
        
                instance.connect(sound, this.destination);

                sound.start(time);

                this.sheduled.push(
                {
                    time  : time,
                    sound : sound
                });
            }
        }
    };

    // start/stop recording
    Looper.prototype.Loop.prototype.sheduleRecording = function() {
        // delayed start on first beat
        var self = this;
        var base = this.beats;
        var time = metronome.nextBeatTime;
        var pos  = metronome.beatsCount % this.beats;

        if (pos > 0) {
            time += (base - pos) * metronome.beatDuration;
        }

        time -= context.currentTime;
        time *= 1000;

        this.timer = window.setTimeout(function() {
            self.locked = false;
        }, time);
    };

    // shedule recording on first beat
    Looper.prototype.Loop.prototype.startRecording = function() {
        // set current loop id
        loops.setCurrentId(this.id);

        // add a new track and set current
        this.incrementTrack();

        // shedule recording on first beat
        this.sheduleRecording();

        // start recording
        this.locked    = true;
        this.recording = true;
        recorder.start(this);
    };

    Looper.prototype.Loop.prototype.stopRecording = function() {
        // stop recording
        window.clearTimeout(this.timer);
        this.recording = false;
        this.locked    = true;
        recorder.stop();

        // current track
        var track = this.getCurrentTrack();

        // track min duration
        if (track && track.duration < this.minDuration)
        {
            // remove last track
            this.tracks.splice(-1, 1); 
            this.currentTrack--;
        }
    };

    // start/stop playing
    Looper.prototype.Loop.prototype.startPlaying = function() {
        // start playing
        this.playing = true;

        // metronome start
        if (! metronome.isRunning())
        {
            metronome.start();
        }
    };

    Looper.prototype.Loop.prototype.stopPlaying = function() {
        // stop playing
        this.playing = false;

        // for each sheduled track
        for (var i in this.sheduled)
        {
            // stop playing
            this.sheduled[i].sound.stop();
        }

        // reset sheduled tracks
        this.sheduled = [];

        // any loops playing ?
        if (! loops.isPlaying())
        {
            //stop metronome
            metronome.stop();
        }
    };

    // do action
    Looper.prototype.Loop.prototype.action = function() {
        // is any loop recording
        if (recorder.isRecording())
        {
            // is current loop recording
            if (this.isRecording())
            {
                this.stopRecording();
            }
            else if (! this.isEmpty())
            {
                // start playing if not empty
                this.startPlaying();
            }
        }
        else
        {
            // not playing loop ?
            if (! this.isPlaying())
            {
                this.startPlaying();

                // first play after stopped
                if (! this.isEmpty())
                {
                    return;
                }
            }

            // start recording
            this.startRecording();
        }
    };

    // stop
    Looper.prototype.Loop.prototype.stop = function() {
        // if recording, stop recording
        if (this.isRecording())
        {
            this.stopRecording();
        }

        // if playing, stop playing
        if (this.isPlaying())
        {
            this.stopPlaying();
        }
    };

    // ------------------------------------------------------------------------
    // Loops (singleton)
    // ------------------------------------------------------------------------
    Looper.prototype.Loops = function(destination) {
        // singleton
        if (loops) {
            return loops;
        }

        // force object instantiation
        if(! (this instanceof instance.Loops)) {
            return new instance.Loops(destination);
        }

        // instance
        loops = this;

        // loop collection
        this.loops = [];

        //current loop id
        this.currentId = null;

        // destination
        this.destination = destination;
    };

    Looper.prototype.Loops.prototype.getLoop = function(id) {
        for (var i in this.loops)
        {
            if (this.loops[i].id == id)
            {
                return this.loops[i];
            }
        }

        return false;
    };

    Looper.prototype.Loops.prototype.getCurrentLoop = function() {
        return this.getLoop(this.currentId);
    };

    Looper.prototype.Loops.prototype.setCurrentId = function(id) {
        this.currentId = id;
    };

    Looper.prototype.Loops.prototype.add = function(loop) {
        loop = loop || new instance.Loop();

        this.loops.push(loop);

        return loop;
    };

    // get loop position
    Looper.prototype.Loops.prototype.getLoopPosition = function(loop) {
        // for each filters
        for (var id in this.loops) {
            // this is the target -> return
            if (this.loops[id].id == loop.id) {
                return parseInt(id);
            }
        }

        // not found
        return null;
    }

    // remove loop
    Looper.prototype.Loops.prototype.remove = function(loop) {
        // stop playing/recording loop
        loop.stop();
        
        // get filter position
        var loopPosition = this.getLoopPosition(loop);
        
        // remove loop from array
        this.loops.splice(loopPosition, 1);
    };

    Looper.prototype.Loops.prototype.each = function(callback, scope) {
        scope = scope || this;

        for (var i in this.loops) {
            callback.call(scope, this.loops[i], i);
        }
    };

    Looper.prototype.Loops.prototype.isPlaying = function() {
        for (var i in this.loops)
        {
            if (this.loops[i].isPlaying())
            {
                return true;
            }
        }

        return false;
    };

    Looper.prototype.Loops.prototype.shedulePlay = function() {
        // for each loop
        loops.each(function(loop) {
            // is playing and one beat or is first beat
            if (loop.isPlaying() && (loop.beats == 1 || metronome.beatsCount % loop.beats == 1))
            {
                loop.play(metronome.nextBeatTime);
            }
        });
    };

    Looper.prototype.Loops.prototype.record = function(e)
    {
        // current loop and track
        var loop   = loops.getCurrentLoop();
        var tracks = loop.tracks;

        // not recording -> exit
        if (! recorder.isRecording() || ! loop.isRecording() || loop.isLocked())
        {
            return;
        }

        // new track
        if(tracks[loop.currentTrack] == null) 
        {
            tracks[loop.currentTrack] = e.inputBuffer;
        } 
        else // exists
        { 
            // append buffer
            tracks[loop.currentTrack] = recorder.appendBuffer(tracks[loop.currentTrack], e.inputBuffer);
        }

        // record limit
        if (tracks[loop.currentTrack].duration > loop.duration - 0.025)
        {
            // overdub
            loop.incrementTrack();
        }
    };

    // ------------------------------------------------------------------------
    // Metronome (singleton)
    // ------------------------------------------------------------------------
    Looper.prototype.Metronome = function(tempo, beats, mute) {
        // singleton
        if (metronome) {
            return metronome;
        }

        // force object instantiation
        if(! (this instanceof instance.Metronome)) {
            return new instance.Metronome(tempo, beats);
        }

        // instance
        metronome = this;

        // min and max tempo
        this.tempoMin = 20;
        this.tempoMax = 220;

        // set tempo & beats
        this.setTempo(tempo || 90);
        this.setBeats(beats || 4);

        // mute
        this.mute(mute || false);

        // gain node for internal sound
        this.gain = context.createGain();

        instance.connect(this.gain, context);

        // reset
        this.reset();
    };
    
    // set / get gain
    Looper.prototype.Metronome.prototype.setGain = function(value, time) {
        instance.setGain(this.gain, value, time);
    };

    // beats table
    Looper.prototype.Metronome.prototype.beatsArray = [1, 2, 4, 8, 16, 32];

    Looper.prototype.Metronome.prototype.getBeatsArray = function() {
        return this.beatsArray;
    } 

    // mute
    Looper.prototype.Metronome.prototype.mute = function(mute) {
        this.muted = !!mute;
    } 

    Looper.prototype.Metronome.prototype.unmute = function() {
        this.mute(false);
    } 

    Looper.prototype.Metronome.prototype.toggleMute = function() {
        this.mute(!this.muted);
    } 

    // set tempo
    Looper.prototype.Metronome.prototype.setTempo = function(tempo) {
        this.tempo = Math.min(Math.max(tempo, this.tempoMin), this.tempoMax);
        this.beatDuration = 60 / this.tempo;

        return this.tempo;
    } 

    // set beats number
    Looper.prototype.Metronome.prototype.allowedBeats = function(beats) {
        return this.beatsArray.indexOf(beats) > -1;
    } 

    Looper.prototype.Metronome.prototype.setBeats = function(beats) {
        beats      = parseInt(beats);
        this.beats = this.allowedBeats(beats) ? beats : this.beats;

        return this.beats;
    }

    // metronome reset
    Looper.prototype.Metronome.prototype.reset = function() {
        this.running      = false;
        this.firstBeat    = false;
        this.timer        = null;
        this.nextBeatTime = null;
        this.beatsQueue   = [];
        this.beatsCount   = 0;
    };

    // is running
    Looper.prototype.Metronome.prototype.isRunning = function() {
        return this.running;
    };

    // is first beat
    Looper.prototype.Metronome.prototype.isFirstBeat = function() {
        return this.firstBeat;
    };

    // drawing callback
    Looper.prototype.Metronome.prototype.draw = function(beat) {
        // ...
    };

    // drawing callback
    Looper.prototype.Metronome.prototype.shedulePlay = function() {};

    // play internal sound
    Looper.prototype.Metronome.prototype.sheduleInternalPlay = function(time, frequency) {
        var o = context.createOscillator();
        o.frequency.value = metronome.isFirstBeat() ? 440 : 220;
        o.connect(this.gain);
        o.start(metronome.nextBeatTime);
        o.stop(metronome.nextBeatTime + 0.05);
    };

    // scheduler
    Looper.prototype.Metronome.prototype.scheduler = function() {
        // next note soon
        while(metronome.nextBeatTime < context.currentTime + 0.1) 
        {
            // increment beat count
            metronome.beatsCount++;

            // first beat ?
            metronome.firstBeat = metronome.beatsCount % metronome.beats == 1;

            // shedule play
            metronome.shedulePlay();

            // shedule internal play
            if (! metronome.muted) {
                metronome.sheduleInternalPlay();
            }

            // push note in queue
            metronome.beatsQueue.push(
            {
                time : metronome.nextBeatTime,
                num  : metronome.beatsCount
            });

            // next beat time
            metronome.nextBeatTime += metronome.beatDuration;
        }

        // runner...
        metronome.timer = window.setTimeout(metronome.scheduler, 25);

        // drawing callback
        window.requestAnimFrame(function() 
        {
            // synced drawing callback
            while(metronome.beatsQueue.length && metronome.beatsQueue[0].time < context.currentTime) 
            {
                // draw
                metronome.draw(metronome.beatsQueue[0]);
                
                // remove from queue
                metronome.beatsQueue.splice(0, 1);
            }
        });
    };

    // metronome start
    Looper.prototype.Metronome.prototype.start = function() {
        // allready started
        if (this.isRunning()) {
            throw new Error('Metronome allready started');
        }

        // next beat as sonn as possible
        this.nextBeatTime = context.currentTime;

        // running status
        this.running = true;

        // run sheduler
        this.scheduler();
    };

    // metronome stop
    Looper.prototype.Metronome.prototype.stop = function() {
        // clear timer
        window.clearTimeout(this.timer);

        // reset
        this.reset();
    };

    // ------------------------------------------------------------------------
    // exports
    // ------------------------------------------------------------------------
    window.Looper = Looper;

})(this);