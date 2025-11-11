'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import GdkPixbuf from 'gi://GdkPixbuf';
import { gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class About extends Adw.PreferencesPage {
    static {
        GObject.registerClass(this);
    }

    constructor(extensionObject) {
        super({
            title: _('About'),
            icon_name: 'help-about-symbolic',
            name: 'about'
        });

        const extensionDir = extensionObject.path;
        const iconFile = GLib.build_filenamev([extensionDir, 'monkeybar.png']);
        const extensionName = extensionObject.metadata.name;
        const extensionVersion = extensionObject.metadata.version || '1.0';
        const extensionDescription = extensionObject.metadata.description;
        const supportedShellVersions = extensionObject.metadata['shell-version']?.join(', ') || 'Unknown';
        const githubLink = 'https://github.com/AROICE-HQ/monkeybar';
        const issueLink = 'https://github.com/AROICE-HQ/monkeybar/issues';
        const sponsorsLink = 'https://github.com/sponsors/aryan-techie';
        const gnomeExtensionsLink = 'https://extensions.gnome.org/extension/8831/monkeybar/';

        // Header Section
        const headerGroup = new Adw.PreferencesGroup();
        this.add(headerGroup);

        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 12,
            margin_top: 24,
            margin_bottom: 24,
            hexpand: true,
            halign: Gtk.Align.CENTER
        });

        const iconImage = new Gtk.Image({
            pixel_size: 96
        });

        try {
            if (Gio.File.new_for_path(iconFile).query_exists(null)) {
                const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(iconFile, 96, 96);
                iconImage.set_from_pixbuf(pixbuf);
            } else {
                iconImage.set_from_icon_name('application-x-addon-symbolic');
            }
        } catch (e) {
            console.error(`Error loading icon: ${e.message}`);
            iconImage.set_from_icon_name('application-x-addon-symbolic');
        }

        const nameLabel = new Gtk.Label({
            label: `<span size="x-large" weight="bold">${extensionName}</span>`,
            use_markup: true
        });

        const descriptionLabel = new Gtk.Label({
            label: extensionDescription,
            wrap: true,
            max_width_chars: 50,
            justify: Gtk.Justification.CENTER,
            css_classes: ['dim-label']
        });

        const versionLabel = new Gtk.Label({
            label: `Version ${extensionVersion}`,
            css_classes: ['caption', 'dim-label']
        });

        headerBox.append(iconImage);
        headerBox.append(nameLabel);
        headerBox.append(descriptionLabel);
        headerBox.append(versionLabel);
        headerGroup.add(headerBox);

        // Developer Section
        const developerGroup = new Adw.PreferencesGroup({
            title: _('Developer')
        });
        this.add(developerGroup);

        const aroiceRow = new Adw.ActionRow({
            title: _('Aryan Techie - AROICE'),
            subtitle: _('Know more about the developer'),
            activatable: true
        });
        const aroiceIcon = new Gtk.Image({
            icon_name: 'avatar-default-symbolic'
        });
        aroiceRow.add_prefix(aroiceIcon);
        developerGroup.add(aroiceRow);
        this._makeRowClickable(aroiceRow, 'https://aryantechie.com');

        const sponsorRow = new Adw.ActionRow({
            title: _('Support on GitHub'),
            subtitle: _('Help fund development'),
            activatable: true
        });
        const sponsorIcon = new Gtk.Image({
            icon_name: 'emblem-favorite-symbolic',
            css_classes: ['error']
        });
        sponsorRow.add_prefix(sponsorIcon);
        developerGroup.add(sponsorRow);
        this._makeRowClickable(sponsorRow, sponsorsLink);

        // Links Section
        const linksGroup = new Adw.PreferencesGroup({
            title: _('Links')
        });
        this.add(linksGroup);

        const githubRow = new Adw.ActionRow({
            title: _('Source Code'),
            activatable: true
        });
        const githubIcon = new Gtk.Image({
            icon_name: 'code-symbolic'
        });
        githubRow.add_prefix(githubIcon);
        linksGroup.add(githubRow);
        this._makeRowClickable(githubRow, githubLink);

        const gnomeRow = new Adw.ActionRow({
            title: _('GNOME Extensions'),
            activatable: true
        });
        const gnomeIcon = new Gtk.Image({
            icon_name: 'org.gnome.Extensions-symbolic'
        });
        gnomeRow.add_prefix(gnomeIcon);
        linksGroup.add(gnomeRow);
        this._makeRowClickable(gnomeRow, gnomeExtensionsLink);

        const issueRow = new Adw.ActionRow({
            title: _('Report Issue'),
            activatable: true
        });
        const issueIcon = new Gtk.Image({
            icon_name: 'dialog-warning-symbolic'
        });
        issueRow.add_prefix(issueIcon);
        linksGroup.add(issueRow);
        this._makeRowClickable(issueRow, issueLink);

        // Legal Section
        const legalGroup = new Adw.PreferencesGroup();
        this.add(legalGroup);

        const licenseRow = new Adw.ActionRow({
            title: _('License'),
            subtitle: _('MIT License')
        });
        const licenseIcon = new Gtk.Image({
            icon_name: 'text-x-copying-symbolic'
        });
        licenseRow.add_prefix(licenseIcon);
        legalGroup.add(licenseRow);
    }

    _makeRowClickable(row, link) {
        row.set_tooltip_text(link);
        row.connect('activated', () => {
            try {
                Gio.AppInfo.launch_default_for_uri(link, null);
            } catch (e) {
                console.error(`Error opening link ${link}: ${e.message}`);
            }
        });
    }
}