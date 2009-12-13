/* This is a template command. */
 var noun_type_word = {
	_name: "search-engine",

	label: "text",


	_langCodes: [/*'en', 'es', */'fr'], //TODO: Handle English and Spanish

	_verbXmlUrl: function(verb, langCode) {
		return CmdUtils.renderTemplate(
			this._requestUrls[langCode].xml, 
			{ 'verb': verb, }
		);
	},

	_requestUrls: {
		fr: {
			page: 'http://www.leconjugueur.com/php5/index.php?v=${verb}',
			xml:  'http://www.leconjugueur.com/php5/index.php?v=${verb}&t=X',
		},
		//TODO: Handle English and Spanis
	},

	
	suggest: function(text) {
		var req = new XMLHttpRequest(); // Query the server via an XMLHttpRequest
		req.open('GET', this._verbXmlUrl(text, "fr"), false); 
		req.send(null);
		var dom = req.responseXML; // Retrieve the response as an XML Document
		CmdUtils.log("before dom");		
		var conjugaisonNodes = dom.evaluate('/leconjugueur/conjugaisons/propositions/proposition', dom, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
		CmdUtils.log("before loop", conjugaisonNodes.snapshotItem(0)) 
		
		var suggestions = [];

		
		for (var i=0; (currentConjugNode = conjugaisonNodes.snapshotItem(i) ) != null; ++i) {

			CmdUtils.log("inside loop", currentConjugNode.textContent); 
			suggestions.push(CmdUtils.makeSugg( currentConjugNode.textContent, null, null));
		}
		CmdUtils.log("before return", suggestions) 
			
		return suggestions ;
	
	},

};

CmdUtils.CreateCommand({
	names: [ "ian" ],
	homepage: 'http://claude.duvergier.fr/developpements/ubiquity/conjugate/conjugate.html',
	author: {name: 'CDuv', email: 'c.duvergier.div@online.fr'},
	license: 'GPL',
	description: 'Conjugate a verb in French (English and Spanish coming soon...)',
	help: 'Type a verb to get it\'s conjugation',
	arguments: [
		{role: 'object', nountype: noun_type_word, label: 'verb'},
		{role: 'format', nountype: noun_type_language, label: 'language'}
	],
	
	_langCodes: [/*'en', 'es', */'fr'], //TODO: Handle English and Spanish
	
	_requestUrls: {
		fr: {
			page: 'http://www.leconjugueur.com/php5/index.php?v=${verb}',
			xml:  'http://www.leconjugueur.com/php5/index.php?v=${verb}&t=X',
		},
		//TODO: Handle English and Spanish
	},
	
	DEFAULT_LANG_CODE : 'fr',
	
	/**
	 * Preview the command.
	 * Display the conjugation.
	 */
	preview: function(previewblock, args) {
		var verb = args.object.text;
		var language = this._getLangCode(args.format);
		
		if (!this._isInputOk(verb)) {
			previewblock.innerHTML = 'Type a verb';
		}
		else { // There is a verb to look for
			if (!this._isLangCodeOk(language)) { // Unknown Language
				previewblock.innerHTML = 'Unknown (or not supported) language "' + language + '".';
			}
			else { // Language OK
				previewblock.innerHTML = 'Please wait...';
				
				var req = new XMLHttpRequest(); // Query the server via an XMLHttpRequest
				req.open('GET', this._verbXmlUrl(verb, language), false); 
				req.send(null);
				var dom = req.responseXML; // Retrieve the response as an XML Document
				
				/** Check for error first **/
				var errorNode = dom.evaluate('/leconjugueur/conjugaisons/error', dom, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
				errorNode = errorNode.snapshotItem(0);
				var errorCode = errorNode.getAttribute('code');
				/** /Check for error first **/
				
				var previewTemplate;
				var previewTemplateData;
				
				if (errorCode != '0') { // If an error is found
					var errorText = errorNode.getAttribute('text');
					
					previewTemplate = '<p>An error occured while conjugating <em>${verb}</em> (#${errorCode}):</p>' +
						'<pre>${errorText}</pre>';
					previewTemplateData = {
						'errorCode': errorCode,
						'errorText': errorText,
						'verb': verb
					};
				} else { // No error
					var conjugaisonNodes = dom.evaluate('/leconjugueur/conjugaisons/conjugaison', dom, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
					
					/* Styles CSS */
					//TODO: Use « jQuery("#tn15rating .bottom div.left",doc).css("top","20px"); » to apply code CSS
					var div_conjugationGroup_style = '';
					var div_conjugation_style = 'float: left; margin-right: 10px; font-size: 10px;';
					var span_time_style = 'text-decoration: underline;';
					var ul_form_style = 'margin: 0; padding: 0; list-style-type: square; list-style-position: inside; font-size: 10px;';
					var ul_form_li_style = 'margin: 0; font-size: 10px;';
					/* /Styles CSS */
					
					var countInCurrentRow = 0;
					var conjugsHtml = '';
					for (var i=0; (currentConjugNode = conjugaisonNodes.snapshotItem(i) ) != null; ++i) {
						if (countInCurrentRow == 0) {
							conjugsHtml += '<div class="conjugationGroup" style="' + div_conjugationGroup_style + '">';
						}
						conjugsHtml += '<div class="conjugation" style="' + div_conjugation_style + '">\n'; // Start a new Conjugation
						conjugsHtml += '<span class="time" style="' + span_time_style + '">' + currentConjugNode.getAttribute('temps') + ':</span>\n'; // Get the time name
						conjugsHtml += '<ul class="form" style="' + ul_form_style + '">\n';
						var forms = currentConjugNode.childNodes;
						for (j=0; j < forms.length; ++j) { // For each <forms> child of the <conjugaison> node
							var currentForm = forms.item(j);
							if (currentForm.nodeType == currentForm.ELEMENT_NODE) {
								conjugsHtml += '<li style="' + ul_form_li_style + '">' + currentForm.textContent + '</li>\n';
							}
						}
						conjugsHtml += '</ul>\n'; // /ul.form
						conjugsHtml += '</div>\n'; // /div.conjugation
						
						++countInCurrentRow;
						if (countInCurrentRow == 4) { // Show four times per line
							conjugsHtml += '</div>'; // /div.conjugationGroup
							conjugsHtml += '<hr style="clear: left;"/>';
							countInCurrentRow = 0;
						}
					}
					
					previewTemplate = '<p>Conjugation of verb <strong><a href="${verbConjugationUrl}">${verb}</a></strong>:</p>' + 
						'${conjugs}';
					previewTemplateData = {
						'verb': verb,
						'verbConjugationUrl': this._verbUrl(verb, language),
						'conjugs': conjugsHtml
					};
				} // /No error
				previewblock.innerHTML = CmdUtils.renderTemplate(previewTemplate, previewTemplateData);
			} // /Language OK
		} // /There is a verb to look for
	}, // /preview()
	
	/**
	 * Execute the command.
	 * Goes to the conjugation page URL.
	 */
	execute: function(args) {
		var verb = args.object.text;
		var language = this._getLangCode(args.format);
		
		Utils.openUrlInBrowser(this._verbUrl(verb, language));
	},
	
	/**
	 * Check if input is OK.
	 * 
	 * @param string	input	The input
	 * @return boolean	<code>true</code> is input is OK, <code>false</code> otherwise
	 */
	_isInputOk: function(input) {
		input = jQuery.trim(input);
		if (input.length < 1) {
			return false;
		}
		else {
			return true;
		}
	},
	
	/**
	 * Check if Language Code is OK.
	 * 
	 * @param string	langCode	The Language Code
	 * @return string	<code>true</code> is input is OK, <code>false</code> otherwise
	 */
	_isLangCodeOk: function(langCode) {
		if (!this._requestUrls[langCode]) {
			return false;
		}
		else {
			return true;
		}
	},
	
	/**
	 * Get language code from Language user input.
	 * 
	 * @param string	input	The input
	 * @return string	The corresponding language code
	 */
	_getLangCode: function(input) {
		langCode = jQuery.trim(input.data);
		
		if (langCode == null || langCode == '') { // If no input
			langCode = Application.prefs.getValue(
				'extensions.ubiquity.default_translation_lang', // Try to get Ubiquity default value
				Application.prefs.getValue( // In case of error:
					'general.useragent.locale', //  Try to get Application (Firefox) default value
					this.DEFAULT_LANG_CODE // In case of error: fall back to Command default
				)
			);
			
			// If langCode is invalid lang code, fall back to Command default.
			if (!noun_type_language.getLangName(langCode)) {
				langCode = this.DEFAULT_LANG_CODE;
			}

		}
		
		if (!this._isLangCodeOk(langCode)) {
			langCode = this.DEFAULT_LANG_CODE;
		}
		
		return langCode;
	},
	
	/**
	 * Get the <code>verb</code>'s conjugation page URL.
	 * 
	 * @param string	verb	The verb to conjugate
	 * @return string	The URL of the conjugation page
	 */
	_verbUrl: function(verb, langCode) {
		return CmdUtils.renderTemplate(
			this._requestUrls[langCode].page, 
			{ 'verb': verb, }
		);
	},
	
	/**
	 * Get the <code>verb</code>'s conjugation XML page URL.
	 * 
	 * @param string	verb	The verb to conjugate
	 * @return string	The URL of the conjugation XML page
	 */
	_verbXmlUrl: function(verb, langCode) {
		return CmdUtils.renderTemplate(
			this._requestUrls[langCode].xml, 
			{ 'verb': verb, }
		);
	},
	

});

