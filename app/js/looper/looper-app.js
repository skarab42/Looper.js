/*
    looper-app.js - 2014

    CopyLeft, License etc... All right! (sic)

    Written by Sébastien Mischler (aka skarab)
*/

(function (window) {
    // ------------------------------------------------------------------------
    // globals
    // ------------------------------------------------------------------------
    var version  = '1.0'; // Looper App version
    var instance = null;  // Looper App instance (singleton)
    var context  = null;  // global audio context
    var looper   = null;  // Looper instance (singleton)
    var looperUI = null;  // Looper UI instance (singleton)

    // ------------------------------------------------------------------------
    // LooperApp (namespace | singleton)
    // ------------------------------------------------------------------------
    function LooperApp() {
        // singleton
        if (instance) {
            return instance;
        }

        // force object instantiation
        if(! (this instanceof LooperApp)) {
            return new LooperApp();
        }

        // instance
        instance = this;

        // Looper instance (singleton)
        looper = Looper();  

        // Looper UI instance (singleton)
        looperUI = LooperUI(); 

        // graphs collection
        this.graphs = {};
    };

    // ------------------------------------------------------------------------
    // create/register AudioGraph
    // ------------------------------------------------------------------------
    LooperApp.prototype.createAudioGraph = function(name) {
        // AudioGrap
        var graph = new looper.AudioGraph();

        // gain analizer
        var analizer = new looper.GainAnalizer(name, looperUI.gainProcessor);

        // attach after graph filters
        analizer.attach(graph.merger);

        // register
        return instance.graphs[name] = {
            graph    : graph,
            analizer : analizer
        };
    };

    LooperApp.prototype.getAudioGraph = function(name) {
        return instance.graphs[name] || null;
    };

    LooperApp.prototype.getGraph = function(name) {
        return instance.graphs[name] ? instance.graphs[name].graph : null;
    };

    LooperApp.prototype.getAnalizer = function(name) {
        return instance.graphs[name] ? instance.graphs[name].analizer : null;
    };

    // ------------------------------------------------------------------------
    // add loop
    // ------------------------------------------------------------------------
    LooperApp.prototype.addLopp = function() {
        // create and add a new loop in Looper.Loops "collection"
        var loop = looper.Loops().add();
        var id   = 'loop_' + loop.id;

        // create loop AudioGraph
        var graph = instance.createAudioGraph(id).graph;

        // set graph as loop destination
        loop.setDestination(graph);
        
        // connect to output graph
        looper.connect(graph, instance.getGraph('output'));

        // user interface
        looperUI.createLoopPanel(id, 'loop', loop).appendTo('#loopsWrapper');
        
        var panel = looperUI.getLoopPanel(loop);

        panel.volume.toggle();

        panel.filtersPanel.toggle();
    };

    // ------------------------------------------------------------------------
    // initialization
    // ------------------------------------------------------------------------
    LooperApp.prototype.init = function(stream) {
        // global audio context
        context = looper.getContext();
        
        // mono to stereo microphone stream
        var microphone = looper.microphone(stream);

        // create input/output AudioGraph
        var input  = instance.createAudioGraph('input').graph;
        var output = instance.createAudioGraph('output').graph;

        // connexions
        looper.connect(microphone, input);
        looper.connect(input, output);
        looper.connect(output, context);

        // Loops instance (singleton)
        var loops = looper.Loops();

        // Metronome init (tempo, beats per bar)
        var metronome = looper.Metronome(90, 4);

        // sheduler callback
        metronome.shedulePlay = loops.shedulePlay;

        // recorder
        var recorder = looper.Recorder(input);

        // on audio process callback
        recorder.onaudioprocess = loops.record;

        // user interface -----------------------------------------------------

        looperUI.createPanel('input').appendTo('#inputWrapper').toggle();
        looperUI.createPanel('output').appendTo('#outputWrapper').toggle();
        looperUI.createMetronomePanel().appendTo('#metronomeWrapper');

        // metronome drawing (on each beat)
        metronome.draw = looperUI.metronomeDraw;

        // first loop
        instance.addLopp();
        instance.addLopp();
        instance.addLopp();
    };

    // ------------------------------------------------------------------------
    // exports
    // ------------------------------------------------------------------------
    window.LooperApp = LooperApp;

})(this);