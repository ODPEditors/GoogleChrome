function h(aString) {
	if (!aString)
		return '';
	return String(aString).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&apos;').split("\\").join('');
};

function openURL(url, selected) {

	if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
		chrome.tabs.create({
			url: url,
			selected: selected
		});
	}
	return false;
}

function cleanSearchTerm(aString) {
	return String(aString).replace(/^https?\:\/+(www[0-9]*\.)?/i, '').split('?')[0].split('#')[0].replace(/\/([a-z]|_|-)+\.[a-z]{2,5}$/i, '').replace(/\/+$/i, '').trim();
}

function cleanURL(aString) {
	aString = String(aString).replace(/^https?\:\/+(www[0-9]*\.)?/i, '').replace(/\/$/, '');
	try {
		aString = decodeURIComponent(aString)
	} catch (e) {}
	return aString
}

//localStorage.clear(); DEBUG

var cache = localStorage;

function search(searchTerm) {
	searchTerm = cleanSearchTerm(searchTerm);
	if (cache[searchTerm]) {
		popup(JSON.parse(cache[searchTerm]), searchTerm)
	} else {
		$('body').attr('loading', true);

		$.ajax({
			type: 'GET',
			dataType: 'html',
			url: 'http://www.dmoz.org/search?q=' + encodeURIComponent(searchTerm),
			success: function (aData) {
				cache[searchTerm] = JSON.stringify(parse(aData));
				popup(JSON.parse(cache[searchTerm]), searchTerm);
			}
		});
	}
}

function parse(html) {
	var sites = []
	try {
		html = html.replace(/<img[^>]+>/g, '').split('<ol')
		html.shift()
		html = '<ol' + (html.join('<ol'));
		$(html).find('li').each(function () {
			var site = {}
			try {
				var link = $($(this).find('a[href^="http"]').get(0))
				try {
					site.url = link.attr('href')
				} catch (e) {
					site.url = '';
				}
				site.title = link.text().trim()
				try {
					site.description = $('<span>' + (link.parent().html().split('</a>')[2]) + '</span>').text().replace(/^\s*-\s/, '').split('--')[0].trim()
				} catch (e) {
					site.description = '';
				}
				try {
					site.category = $($(this).find('a').get(2)).text().trim().replace(/\s*\:\s*/g, '/').replace(/\s/g, '_')
				} catch (e) {
					site.category = ''
				}
				if (site.title != '') {
					site.url_title = cleanURL(site.url)
					site.title_title = site.title + '\n\n' + site.description + '\n\n' + site.category
					sites[sites.length] = site;
				}
			} catch (e) {}
		});
	} catch (e) {}
	return sites;
}

function popup(sites, searchTerm) {

	if (sites.length == 0 && searchTerm.indexOf('/') != -1) {

		searchTerm = searchTerm.split('/')
		searchTerm.pop()
		searchTerm = cleanSearchTerm(searchTerm.join('/'))
		$('input').val(searchTerm)
		search(searchTerm)

	} else {

		$('.results').empty();

		$('body').attr('loading', false);

		if (sites.length) {

			var template = _.template($('.template').html())

			for (var id in sites) {
				$('.results').append(template(sites[id]))
			}
		} else {
			$('.results').append('<b>No results</b>');
		}

		$('.results').show();
		$('.result').get(0).click()
		$('.result').get(0).focus()
		$('input').focus()
	}
}

window.onload = function () {
	var currentURL = ''

	chrome.windows.getCurrent(function (win) {
		chrome.tabs.getSelected(win.id, function (tab) {
			currentURL = tab.url;

			$('body').click(function (e) {
				var tag = $($(e.target).prop("tagName") == 'A' ? e.target : $(e.target).parents('a').get(0))
				if (tag.prop("tagName") == 'A')
					openURL(tag.attr('href').replace('{currentURL}', encodeURIComponent(currentURL)), tag.attr('tab') != 'background');
			});

			$('input').keypress(function (e) {
				if (e.keyCode == 13) {
					search($('input').val());
				}
			});

			if (currentURL.indexOf('http') === 0) {
				$('input').val(cleanSearchTerm(currentURL))
				search(currentURL)
			}
			$('input').focus()

		});
	});

}