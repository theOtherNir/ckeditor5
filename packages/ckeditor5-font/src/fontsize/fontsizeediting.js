/**
 * @license Copyright (c) 2003-2021, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/**
 * @module font/fontsize/fontsizeediting
 */

import { Plugin } from 'ckeditor5/src/core';
import { CKEditorError } from 'ckeditor5/src/utils';

import FontSizeCommand from './fontsizecommand';
import { normalizeOptions } from './utils';
import { buildDefinition, FONT_SIZE } from '../utils';

// Mapping of `<font size="..">` styling to CSS's `font-size` values.
const styleFontSize = [
	'x-small', // Size "0" equal to "1".
	'x-small',
	'small',
	'medium',
	'large',
	'x-large',
	'xx-large',
	'xxx-large'
];

/**
 * The font size editing feature.
 *
 * It introduces the {@link module:font/fontsize/fontsizecommand~FontSizeCommand command} and the `fontSize`
 * attribute in the {@link module:engine/model/model~Model model} which renders in the {@link module:engine/view/view view}
 * as a `<span>` element with either:
 * * a style attribute (`<span style="font-size:12px">...</span>`),
 * * or a class attribute (`<span class="text-small">...</span>`)
 *
 * depending on the {@link module:font/fontsize~FontSizeConfig configuration}.
 *
 * @extends module:core/plugin~Plugin
 */
export default class FontSizeEditing extends Plugin {
	/**
	 * @inheritDoc
	 */
	static get pluginName() {
		return 'FontSizeEditing';
	}

	/**
	 * @inheritDoc
	 */
	constructor( editor ) {
		super( editor );

		// Define default configuration using named presets.
		editor.config.define( FONT_SIZE, {
			options: [
				'tiny',
				'small',
				'default',
				'big',
				'huge'
			],
			supportAllValues: false
		} );
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;

		// Allow fontSize attribute on text nodes.
		editor.model.schema.extend( '$text', { allowAttributes: FONT_SIZE } );
		editor.model.schema.setAttributeProperties( FONT_SIZE, {
			isFormatting: true,
			copyOnEnter: true
		} );

		const supportAllValues = editor.config.get( 'fontSize.supportAllValues' );

		// Define view to model conversion.
		const options = normalizeOptions( this.editor.config.get( 'fontSize.options' ) )
			.filter( item => item.model );
		const definition = buildDefinition( FONT_SIZE, options );

		// Set-up the two-way conversion.
		if ( supportAllValues ) {
			this._prepareAnyValueConverters( definition );
			this._prepareCompatibilityConverter();
		} else {
			editor.conversion.attributeToElement( definition );
		}

		// Add FontSize command.
		editor.commands.add( FONT_SIZE, new FontSizeCommand( editor ) );
	}

	/**
	 * These converters enable keeping any value found as `style="font-size: *"` as a value of an attribute on a text even
	 * if it is not defined in the plugin configuration.
	 *
	 * @param {Object} definition {@link module:engine/conversion/conversion~ConverterDefinition Converter definition} out of input data.
	 * @private
	 */
	_prepareAnyValueConverters( definition ) {
		const editor = this.editor;

		// If `fontSize.supportAllValues=true`, we do not allow to use named presets in the plugin's configuration.
		const presets = definition.model.values.filter( value => !String( value ).match( /[\d.]+[\w%]+/ ) );

		if ( presets.length ) {
			/**
			 * If {@link module:font/fontsize~FontSizeConfig#supportAllValues `config.fontSize.supportAllValues`} is `true`,
			 * you need to use numerical values as font size options.
			 *
			 * See valid examples described in the {@link module:font/fontsize~FontSizeConfig#options plugin configuration}.
			 *
			 * @error font-size-invalid-use-of-named-presets
			 * @param {Array.<String>} presets Invalid values.
			 */
			throw new CKEditorError(
				'font-size-invalid-use-of-named-presets',
				null, { presets }
			);
		}

		editor.conversion.for( 'downcast' ).attributeToElement( {
			model: FONT_SIZE,
			view: ( attributeValue, { writer } ) => {
				if ( !attributeValue ) {
					return;
				}

				return writer.createAttributeElement( 'span', { style: 'font-size:' + attributeValue }, { priority: 7 } );
			}
		} );

		editor.conversion.for( 'upcast' ).attributeToAttribute( {
			model: {
				key: FONT_SIZE,
				value: viewElement => viewElement.getStyle( 'font-size' )
			},
			view: {
				name: 'span',
				styles: {
					'font-size': /.*/
				}
			}
		} );
	}

	/**
	 * Support `<font size="..">` formatting.
	 *
	 * @private
	 */
	_prepareCompatibilityConverter() {
		const editor = this.editor;

		editor.conversion.for( 'upcast' ).elementToAttribute( {
			view: {
				name: 'font',
				attributes: {
					// Size from 0 to 7.
					'size': /^[0-7]$/
				}
			},
			model: {
				key: FONT_SIZE,
				value: viewElement => {
					const value = viewElement.getAttribute( 'size' );

					return styleFontSize[ Number( value ) ];
				}
			}
		} );
	}
}
