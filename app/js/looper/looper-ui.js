/*
	looper-ui.js - 2014

	CopyLeft, License etc... All right! (sic)

	Written by Sébastien Mischler (aka skarab)
*/

(function (window) {
	// ------------------------------------------------------------------------
	// globals
	// ------------------------------------------------------------------------
	var version  = '1.0'; // Looper UI version
	var instance = null;  // Looper UI instance (singleton)
	var ui       = {};    // ui objects collection

	// ------------------------------------------------------------------------
	// LooperUI (namespace | singleton)
	// ------------------------------------------------------------------------
	function LooperUI() {
		// singleton
		if (instance) {
			return instance;
		}

		// force object instantiation
		if(! (this instanceof LooperUI)) {
			return new LooperUI();
		}

		// instance
		instance = this;
	};

	// ------------------------------------------------------------------------
	// requestAnimFrame fallback
	// ------------------------------------------------------------------------
	window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
			    window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				function(callback, element){
					window.setTimeout(callback, 1000 / 60);
				};
	})();

	// ----------------------------------------------------------------------------
	// truncate string at length and add suffix at end
	// ----------------------------------------------------------------------------
	LooperUI.prototype.truncateString = function(str, length, suffix) {
 		suffix = suffix || '...';
 		length = length || 10;

 		if (str.length > length) {
 			str = str.substring(0, length - suffix.length) + suffix;
 		}

 		return str;
  	}

	// ------------------------------------------------------------------------
	// gain analizer processor
	// ------------------------------------------------------------------------
	LooperUI.prototype.gainProcessor = function(data) {
		// target panel
		var panel = ui[this.name];

		// if data; draw data
		data && window.requestAnimFrame(function() {
			// db and position values
			var dbL  = (data.left.db  || '∞') + ' db';
			var dbR  = (data.right.db || '∞') + ' db';
			var posL = data.left.clipping  ? 1 : data.left.pos;
			var posR = data.right.clipping ? 1 : data.right.pos;

			// draw values
			panel.meterL.draw(posL, dbL);
			panel.meterR.draw(posR, dbR);
		});
	};

	
	// ------------------------------------------------------------------------
	// input : base
	// ------------------------------------------------------------------------
	LooperUI.prototype.input = function(id, className, type, value, attrs) {
		// input element
		var input = $('<input />').addClass(className);

		// default attributes
		input.attr({
			type : type,
			id   : id,
			name : id
		});

		// user attributes
		attrs && input.attr(attrs);

		// set default value
		input.val(value);

		// return jQuery element
		return input;
	};

	// ------------------------------------------------------------------------
	// input : range
	// ------------------------------------------------------------------------
	LooperUI.prototype.rangeInput = function(id, value, min, max, step) {
		return instance.input(id, 'rangeInput', 'range', value, {
			min  : min  || 0,
			max  : max  || 1, 
			step : step || 0.1
		});
	};

	// ------------------------------------------------------------------------
	// select : base
	// ------------------------------------------------------------------------
	LooperUI.prototype.select = function(id, className, options, selected, attrs) {
		// select element
		var select = $('<select />').addClass(className);

		// default attributes
		select.attr({
			id   : id,
			name : id
		});

		// user attributes
		attrs && select.attr(attrs);

		// for each option
		for (var i in options) {
			var option = $('<option />');
			var value  = options[i];
			var label  = value;
			
			if (typeof value == 'object') {
				label  = value[1];
				value  = value[0];
			}

			if (selected == value) {
				option.attr('selected', 'selected');
			}

			option.val(value);
			option.html(label);
			select.append(option);
		}

		// return jQuery element
		return select;
	};

	// ------------------------------------------------------------------------
	// Buttons
	// ------------------------------------------------------------------------
	LooperUI.prototype.muteButton = function(id) {
		var img    = (id == 'input') ? 'microphone' : 'volume-up';
		var button = $('<i class="fa fa-' + img + ' mute"/>');

		return button.attr('title', 'mute / unmute');
	};

	LooperUI.prototype.activateButton = function() {
		var button = $('<i class="fa fa-power-off activate"/>');

		return button.attr('title', 'deactivate / activate');
	};

	LooperUI.prototype.removeButton = function() {
		var button = $('<i class="fa fa-trash-o remove"/>');

		return button.attr('title', 'remove');
	};

	// ------------------------------------------------------------------------
	// Icones
	// ------------------------------------------------------------------------
	LooperUI.prototype.metronomeIcon = function() {
		return $('<i class="fa fa-bell"/>');
	};

	// ------------------------------------------------------------------------
	// Panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.Panel = function(id, title, className) {
		// elements
		this.$wrapper   = $('<div />');
		this.$title     = $('<h3 />');
		this.$titleHTML = $('<span />');
		this.$toggle    = $('<i />');
		this.$content   = $('<div />');
		
		// elements attributes
		this.$wrapper.attr('id', id);
		this.$toggle.attr('title', 'toggle content');
		
		// elements classes
		this.$wrapper.addClass('panel ' + (className || ''));
		this.$title.addClass('title');
		this.$toggle.addClass('toggle fa fa-arrow-circle-o-down');
		this.$content.addClass('content');

		// set panel title
		this.setTitle(title || id);

		// events
		var self = this;

		this.$toggle.on('click', function() {
			self.toggle();
		});

		// append elements to wrapper
		this.$title.append(this.$toggle);
		this.$title.append(this.$titleHTML);
		this.$wrapper.append(this.$title);
		this.$wrapper.append(this.$content);
	};

	// set panel title
	LooperUI.prototype.Panel.prototype.setTitle = function(html) {
		this.$titleHTML.html(html);
		return this;
	};

	// append/prepend content
	LooperUI.prototype.Panel.prototype.append = function(element) {
		this.$content.append(element.$wrapper || element);
		return this;
	};

	LooperUI.prototype.Panel.prototype.prepend = function(element) {
		this.$content.prepend(element.$wrapper || element);
		return this;
	};

	// append to element
	LooperUI.prototype.Panel.prototype.appendTo = function(element) {
		$(element).append(this.$wrapper);
		return this;
	};

	// toggle content
	LooperUI.prototype.Panel.prototype.toggle = function() {
		this.$content.toggle();
		return this;
	};

	// ------------------------------------------------------------------------
	// Input
	// ------------------------------------------------------------------------
	LooperUI.prototype.Input = function(id, label, type, value, unity, attrs) {
		// elements
		this.$wrapper = $('<label />').addClass('widget input');
		this.$label   = $('<span />').addClass('label');
		this.$value   = $('<span />').addClass('value');
		this.unity    = unity || null;

		// wrapper attributes
		this.$wrapper.attr('for', id);

		// input type
		if (type == 'gain') {
			this.$input = instance.rangeInput(id, value, 0, 1, 0.01);
		}
		else {
			// default ... id, className, type, value, attrs
			this.$input = instance.input(id, type + 'Input', type, value, attrs);
		}

		// set defaults
		this.setLabel(label);
		this.setValue(value);

		// append elements to wrapper
		this.$wrapper.append(this.$label);
		this.$wrapper.append(this.$input);
		this.$wrapper.append(this.$value);
	}

	// set label
	LooperUI.prototype.Input.prototype.setLabel = function(label) {
		this.$label.html(label);
	}

	// update value
	LooperUI.prototype.Input.prototype.updateValue = function() {
		var value = this.$input.val();
		var unity = this.unity;

		if (this.unity == '%') 
		{
			value = parseInt(value * 100);
		}
		else if (this.unity == 'bool') 
		{
			value = parseInt(value) ? 'true' : 'false';
			unity = null;
		}

		this.$value.html(value + (unity || ''));
	}

	// set value
	LooperUI.prototype.Input.prototype.setValue = function(value) {
		this.$input.val(value);
		this.updateValue();
	}

	// on event alias
	LooperUI.prototype.Input.prototype.on = function(type, callback) {
		this.$input.on(type, function() {
			callback.call(this, $(this).val());
		});
	}

	// onchange event
	LooperUI.prototype.Input.prototype.onInput = function(callback) {
		this.on('input', callback);
	}

	// ------------------------------------------------------------------------
	// Select
	// ------------------------------------------------------------------------
	LooperUI.prototype.Select = function(id, label, options, button, selected, attrs) {
		// elements
		this.$wrapper = $('<label />').addClass('widget select');
		this.$label   = $('<span />').addClass('label');
		this.$input   = instance.select(id, 'selectInput', options, selected, attrs);

		if (button) {
			this.$button = $('<button/>').html(button);
		}

		// set defaults
		this.setLabel(label);

		// append elements to wrapper
		this.$wrapper.append(this.$label);
		this.$wrapper.append(this.$input);
		button && this.$wrapper.append(this.$button);
	}

	// set label
	LooperUI.prototype.Select.prototype.setLabel = function(label) {
		this.$label.html(label);
	}

	// get selected
	LooperUI.prototype.Select.prototype.getSelected = function() {
		return this.$input.val();
	}

	// on event alias
	LooperUI.prototype.Select.prototype.on = function(type, callback) {
		this.$input.on(type, function() {
			callback.call(this, $(this).val());
		});
	}

	// onchange event
	LooperUI.prototype.Select.prototype.onChange = function(callback) {
		this.on('change', callback);
	}

	// button click event
	LooperUI.prototype.Select.prototype.onButtonClick = function(callback) {
		var self = this;
		this.$button.on('click', function() {
			callback.call(this, self.$input.val());
		});
	}

	// ------------------------------------------------------------------------
	// Meter
	// ------------------------------------------------------------------------
	LooperUI.prototype.Meter = function(label, width, height, value, dir) {
		// elements
		this.$wrapper = $('<div />').addClass('widget meter');
		this.$canvas  = $('<canvas />').addClass('meter');
		this.$label   = $('<span />').addClass('label');
		this.$value   = $('<span />').addClass('value');

		// wrapper attributes
		this.$canvas.attr({
			width  : width,
			height : height
		});

		// label
		label && this.setLabel(label);

		// append elements to wrapper
		label && this.$wrapper.append(this.$label);
		this.$wrapper.append(this.$canvas);
		this.$wrapper.append(this.$value);

		// variables
		this.context   = this.$canvas[0].getContext('2d');
		this.direction = dir || 'top';
		this.unit      = width / 10;
		this.width     = width;
		this.height    = height;

		// add linear gradient
		if (this.direction == 'right') {
      		this.gradient = this.context.createLinearGradient(0, 0, width, 0);
      	}
      	else {
      		this.gradient = this.context.createLinearGradient(0, height, 0, 0);
      	}
		
		this.gradient.addColorStop(0, '#00ff00');  
		this.gradient.addColorStop(0.8, '#ffa500'); 
		this.gradient.addColorStop(0.9, '#ffa500'); 
		this.gradient.addColorStop(1, '#ff0000');

      	this.context.fillStyle = this.gradient;

		// first drawing
		this.draw(value);
	}

	// drawing
	LooperUI.prototype.Meter.prototype.draw = function(value, db) {
      	// clear last draw
      	this.context.clearRect(0, 0, this.width, this.height);

      	// directions
      	if (this.direction == 'right') {
      		this.context.fillRect(0, 0, this.width * value, this.height);
      	}
      	else {
      		var offset = this.height * value;

      		this.context.fillRect(0, this.height - offset, this.width, offset);
      	}

      	// html value
      	this.$value.html(db);
	}

	// set label
	LooperUI.prototype.Meter.prototype.setLabel = function(label) {
		this.$label.html(label);
	};

	// ------------------------------------------------------------------------
	// create input filters panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.createFilterProperty = function(id, name, filter, property) {
		// current property
		var propertyInput = null;
		
		// truncate label
		var label = instance.truncateString(name, 14);
		var title = name;

		// boolean value
		if (property.type == 'boolean') {
			// id, label, type, value, unity, attrs
			var val   = property.value ? 1 : 0;
			var title = name + ' [true|false]';

			propertyInput = new instance.Input(id, label, 'range', val, 'bool', {
				min  : 0,
				max  : 1,
				step : 1
			});

			// events
			propertyInput.onInput(function(value) {
				propertyInput.setValue(value);
				filter[name] = parseInt(value);
			});
		}
		else // numeric value
		{
			// step, range, unity values
			var step  = 0.1;
			var range = Math.abs(property.min) + Math.abs(property.max);
			var unity = range / 100;

			
			if (name == 'algorithmIndex' || name == 'filterType') {
				step = 1;
			}
			else if (unity >= 1) {
				step = Math.round(unity);

				// normalize
				if (step >= 1000) {
					step = 1000;
				}
				else if (step >= 100) {
					step = 100;
				}
				else if (step >= 10) {
					step = 10;
				}
				else {
					step = 1;
				}
			}
			else {
				// multiplier
				var decimals   = 3;
				var multiplier = Math.pow(10, decimals);

				// new step
				step = Math.round(unity * multiplier) / multiplier;

				// normalize
				if (step <= 0.01) {
					step = 0.01;
				}
				else {
					step = 0.1;
				}
			}

			// title
			var title = name + ' [min: ' + property.min + ']'
			 				 + ' [max: ' + property.max + ']'
			 				 + ' [step: ' + step + ']';

			// id, label, type, value, unity, attrs
			propertyInput = new instance.Input(id, label, 'range', property.value, '', {
				min  : property.min,
				max  : property.max,
				step : step
			});

			// events
			propertyInput.onInput(function(value) {
				propertyInput.setValue(value);
				filter[name] = value;
			});
		}

		// label title attribute
		propertyInput.$label.attr('title', title);

		return propertyInput;
	}

	// ------------------------------------------------------------------------
	// create input filters panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.createFilterImpulse = function(id, name, filter) {
		// id, label, type, value, unity, attrs
		var files   = Looper().getFiltersImpulses();
		var impulse = new instance.Select(id, 'impulse', files);

		// events
		impulse.onChange(function(value) {
			var impulsePath = './impulses/' + value + '.wav';

			if (name == 'Cabinet') {
				filter.convolver.buffer = impulsePath;
			}
			else {
				filter.buffer = impulsePath;
			}	
		});

		return impulse;
	}

	// ------------------------------------------------------------------------
	// create input filters panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.addInputFilter = function(id, name) {
		// filter
		var filterObject = LooperApp().getGraph(id).addFilter(name);
		var filterId     = id + 'FilterPanel-' + filterObject.id;
		var filter       = filterObject.filter;

		// elements
		var panel  = new instance.Panel(filterId, name, id + 'FilterPanel');
		var trash  = instance.removeButton();
		var mute   = instance.activateButton();

		// Convolver
		if (name == 'Cabinet' || name == 'Convolver') {
			// impulse input
			var impulse = instance.createFilterImpulse(filterId + 'impulse', name, filter);
			
			// append input
			panel.append(impulse);
		}

		// events
		mute.on('click', function() {
			filter.bypass = ! filter.bypass;
			mute.toggleClass('deactivated');
		});

		trash.on('click', function() {
			LooperApp().getGraph(id).removeFilter(filterObject);
			panel.$wrapper.remove();
		});

		// filter properties
		var properties = filter.getDefaultsAsObject();
		
		for (var name in properties) {
			// skip bypass
			if (name == 'bypass')
			{
				continue;
			}

			// property input
			var propertyId    = filterId + name;
			var propertyInput = instance.createFilterProperty(propertyId, name, filter, properties[name]);
			
			// append input
			panel.append(propertyInput);
		}

		// appends
		panel.$title.append(mute);
		panel.$title.append(trash);
		ui[id].filtersPanel.append(panel);
	}

	// ------------------------------------------------------------------------
	// create input filters panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.createFiltersPanel = function(id) {
		// init id
		if (! ui[id]) {
			ui[id] = {};
		}

		// elements
		ui[id].filtersPanel = new instance.Panel(id + 'FiltersPanel', 'filters');
		ui[id].filters      = new instance.Select(id + 'Filters', 'filters (tuna.js)',  Looper().getFilters(), 'add');
		ui[id].activate     = instance.activateButton();

		// appends
		ui[id].filtersPanel.$title.append(ui[id].activate);
		ui[id].filtersPanel.append(ui[id].filters);

		// events
		ui[id].filters.onButtonClick(function(filterName) {
			instance.addInputFilter(id, filterName);
		});

		ui[id].activate.on('click', function() {
			LooperApp().getGraph(id).toggleFilters();
			ui[id].activate.toggleClass('deactivated');
		});

		// return the panel
		return ui[id].filtersPanel;
	}

	// ------------------------------------------------------------------------
	// Panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.createPanel = function(id, title, className) {
		// first object
		if (! ui[id]) {
			ui[id] = {};
		}

		// create base panel
		ui[id].panel  = new instance.Panel(id, title, className);
		ui[id].volume = new instance.Panel(id + 'Volume', 'volume');
		ui[id].meterL = new instance.Meter('left gain', 170, 10, 0, 'right');
		ui[id].meterR = new instance.Meter('right gain', 170, 10, 0, 'right');
		ui[id].gain   = new instance.Input(id + 'Gain'  , 'gain [master]', 'gain', '0.8', '%');
		ui[id].gainL  = new instance.Input(id + 'GainL' , 'gain [left]'  , 'gain', '1'  , '%');
		ui[id].gainR  = new instance.Input(id + 'GainR' , 'gain [right]' , 'gain', '1'  , '%');
		ui[id].gainLR = new instance.Input(id + 'GainLR', 'gain [both]'  , 'gain', '1'  , '%');
		ui[id].mute   = instance.muteButton(id);
		ui[id].mute2  = instance.muteButton(id);

		// filter panel
		instance.createFiltersPanel(id);

		// appends
		ui[id].panel.$title.append(ui[id].mute);
		ui[id].panel.append(ui[id].meterL);
		ui[id].panel.append(ui[id].meterR);
		ui[id].volume.$title.append(ui[id].mute2);
		ui[id].volume.append(ui[id].gain);
		ui[id].volume.append(ui[id].gainL);
		ui[id].volume.append(ui[id].gainR);
		ui[id].volume.append(ui[id].gainLR);
		ui[id].panel.append(ui[id].volume);
		ui[id].panel.append(ui[id].filtersPanel);

		// application instance
		var app = LooperApp();

		// events
		var mute = function() {
			app.getGraph(id).toggleMute();
			ui[id].mute.toggleClass('muted');
			ui[id].mute2.toggleClass('muted');
		};

		ui[id].mute.on('click', mute);
		ui[id].mute2.on('click', mute);

		ui[id].gain.onInput(function(value) {
			app.getGraph(id).setGain(value);
			ui[id].gain.updateValue();
		});

		ui[id].gainL.onInput(function(value) {
			app.getGraph(id).setGainL(value);
			ui[id].gainL.updateValue();
		});

		ui[id].gainR.onInput(function(value) {
			app.getGraph(id).setGainR(value);
			ui[id].gainR.updateValue();
		});

		ui[id].gainLR.onInput(function(value) {
			app.getGraph(id).setGainLR(value);
			ui[id].gainL.setValue(value);
			ui[id].gainR.setValue(value);
			ui[id].gainLR.setValue(value);
		});

		return ui[id].panel;
	};

	// ------------------------------------------------------------------------
	// Metronome Panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.createMetronomePanel = function() {
		// first object
		ui.metronome = {};

		// metronome instance (singleton)
		var metronome = Looper().Metronome();

		// main panel
		ui.metronome.panel  = new instance.Panel('metronome');
		
		ui.metronome.mute   = instance.muteButton('metronome');
		ui.metronome.icon   = instance.metronomeIcon();
		ui.metronome.tempo  = new instance.Input('metronomeTempo', 'tempo', 'number', metronome.tempo, null, {
			min  : metronome.tempoMin,
			max  : metronome.tempoMax,
			step : 1,
		});
		ui.metronome.beats  = new instance.Select('metronomeBeats', 'beats', metronome.getBeatsArray(), 'apply to all', metronome.beats);
		ui.metronome.gain   = new instance.Input('metronomeGain', '"bip" volume', 'gain', '0.8', '%');

		// button title
		ui.metronome.beats.$button.attr('title', 'Only on EMPTY loop!');

		// appends
		ui.metronome.panel.$title.append(ui.metronome.mute);
		ui.metronome.panel.$titleHTML.prepend(ui.metronome.icon);
		ui.metronome.panel.append(ui.metronome.tempo);
		ui.metronome.panel.append(ui.metronome.beats);
		ui.metronome.panel.append(ui.metronome.gain);

		// events

		ui.metronome.gain.onInput(function(value) {
			metronome.setGain(value);
			ui.metronome.gain.updateValue();
		});

		ui.metronome.mute.on('click', function() {
			metronome.toggleMute();
			ui.metronome.mute.toggleClass('muted');
		});
		
		//ui.metronome.toggle.on('click', function() {
		ui.metronome.icon.on('click', function() {
			if (metronome.isRunning()) {
				metronome.stop();
				ui.metronome.icon.attr('title', 'start');
			}
			else
			{
				metronome.start();
				ui.metronome.icon.attr('title', 'stop');
			}
		});

		ui.metronome.tempo.on('change', function() {
			ui.metronome.tempo.setValue(metronome.setTempo($(this).val()));
		});

		ui.metronome.beats.on('change', function() {
			metronome.setBeats($(this).val());
		});

		ui.metronome.beats.onButtonClick(function(beats) {
			// for each loop
			Looper().Loops().each(function(loop, index) {
				// only if empty
				if (loop.isEmpty()) {
					loop.setBeats(beats);
					var panel = instance.getLoopPanel(loop);
					panel.panel.beats.$input.val(beats);
				}
			});
		});

		// return panel
		return ui.metronome.panel;
	};

	// ------------------------------------------------------------------------
	// Loops drawing callback
	// ------------------------------------------------------------------------
	LooperUI.prototype.loopsDraw = function(beat) {
		// recording
		var looper    = Looper();
		var loops     = looper.Loops();
		var recorder  = looper.Recorder();
		var metronome = looper.Metronome();
		
		if (recorder.isRecording())
		{
			var loop  = loops.getCurrentLoop();
			var panel = LooperUI().getLoopPanel(loop);

			panel.panel.$wrapper.addClass('highlight');
			
			if (metronome.beatsCount % loop.beats == 1)
			{
				panel.panel.$wrapper.addClass('firstBeat');
			}

			// remove class
			window.setTimeout(function() 
			{
				panel.panel.$wrapper.removeClass('highlight firstBeat');
			}, 100);

			if (loop.isOverdubbing()) {
				panel.panel.$wrapper.addClass('overdubbing');
			}

			if (loop.isLocked()) {
				panel.panel.$wrapper.addClass('locked');
			}
			else {
				panel.panel.$wrapper.removeClass('locked');
			}
		}

		// playing loop time line
		for (var i in loops.loops) {
			var loop2 = loops.loops[i];

			// if playing
			if (loop2.isPlaying())
			{
				var panel2 = LooperUI().getLoopPanel(loop2);

				// one beat
				if (loop2.beats == 1)
				{
					(function(){
						var tl = panel2.panel.$timeLine;

						tl.width('100%');
						tl.addClass('firstBeat');
						tl.css('margin-left', '0px');
			
						// hide
						window.setTimeout(function() 
						{
							tl.width('0%');
						}, 100);
					})();

					continue;
				}

				// multy beats
				var mod  = beat.num % loop2.beats;
				    mod  = mod == 0 ? loop2.beats : mod;
				var unit = 100 / loop2.beats;
				var pos  = (mod - 1) * unit;

				panel2.panel.$timeLine.width(unit + '%');
				panel2.panel.$timeLine.css('margin-left', pos + '%');

				if (mod == 1)
				{
					panel2.panel.$timeLine.addClass('firstBeat');
				}
				else if (mod == 2)
				{
					panel2.panel.$timeLine.removeClass('firstBeat');
				}
			}
		}
	};

	// ------------------------------------------------------------------------
	// Metronome drawing callback
	// ------------------------------------------------------------------------
	LooperUI.prototype.metronomeDraw = function(beat) {
		// highlight class
		ui.metronome.panel.$wrapper.addClass('highlight');
		
		// metronome instance (singleton)
		var metronome = Looper().Metronome();

		// is first beat
		if (metronome.isFirstBeat()) {
			ui.metronome.panel.$wrapper.addClass('firstBeat');
		}

		// remove class
		window.setTimeout(function() 
		{
			ui.metronome.panel.$wrapper.removeClass('highlight firstBeat');
		}, 100);

		// draw loops
		instance.loopsDraw(beat);
	};

	// ------------------------------------------------------------------------
	// return loopPanel
	// ------------------------------------------------------------------------
	LooperUI.prototype.getLoopPanel = function(loop) {
		return ui['loop_' + loop.id] || ui['loop_' + loop] || null;
	};

	// ------------------------------------------------------------------------
	// Panel
	// ------------------------------------------------------------------------
	LooperUI.prototype.createLoopPanel = function(id, title, loop) {
		// metronome instance (singleton)
		var metronome = Looper().Metronome();

		// main panel
		var panel = instance.createPanel(id, title);

		panel.$loop            = $('<div class="loop" />');
		panel.$mainButton      = $('<button class="mainButton"><i class="fa fa-play"></i> / <i class="fa fa-circle"></i></button>');
		panel.$stopButton      = $('<button class="stopButton"><i class="fa fa-stop"></i></button>');
		panel.$timeLineWrapper = $('<div class="timeLineWrapper"></div>');
		panel.$timeLine        = $('<div class="timeLine"></div>');
		panel.beats            = new instance.Select(id + 'Beats', 'beats', metronome.getBeatsArray(), null, metronome.beats);
		
		// append elements
		panel.$loop.append(panel.$stopButton);
		panel.$loop.append(panel.$mainButton);
		panel.$timeLineWrapper.append(panel.$timeLine);
		panel.$loop.append(panel.$timeLineWrapper);
		panel.$loop.append(panel.beats.$wrapper);
		panel.$title.after(panel.$loop);

		// events
		panel.$mainButton.on('click', function() {
			loop.action();

			if (loop.isPlaying()) {
				panel.$wrapper.addClass('playing');
			}

			if (loop.isRecording()) {
				panel.$wrapper.addClass('recording');
			}
			else
			{
				panel.$wrapper.removeClass('recording');
			}

			if (loop.isOverdubbing()) {
				panel.$wrapper.addClass('overdubbing');
			}
			else
			{
				panel.$wrapper.removeClass('overdubbing');
			}

			if (loop.isLocked()) {
				panel.$wrapper.addClass('locked');
			}
			else
			{
				panel.$wrapper.removeClass('locked');
			}
		});

		panel.$stopButton.on('click', function() {
			loop.stop();
			
			panel.$wrapper.removeClass('locked');
			panel.$wrapper.removeClass('playing');
			panel.$wrapper.removeClass('recording');
			panel.$wrapper.removeClass('overdubbing');
		});

		panel.beats.on('change', function() {
			loop.setBeats($(this).val());
		});
		
		// return the panel
		return panel;
	};

	// ------------------------------------------------------------------------
	// exports
	// ------------------------------------------------------------------------
	window.LooperUI = LooperUI;

})(this);