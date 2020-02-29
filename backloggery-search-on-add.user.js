// ==UserScript==
// @name     Backloggery Search on Add
// @author   Xiyng
// @version  0.2
// @grant    GM.xmlHttpRequest
// @include  https://backloggery.com/newgame.php?user=*
// @run-at   document-idle
// @require  https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// ==/UserScript==

'use strict';

const baseUrl = 'https://backloggery.com';
const minSearchintervalMilliSeconds = 2000;

let searchTimeout = null;
let lastSearchDate = new Date();

initialize();

function initialize() {
    const addGameButton = document.body.querySelector('input[value="Add Game"]');
    const addGameButtonContainer = addGameButton.parentNode;
    const searchResultContainer = $('<div><p><b>Similar games</b></p><ul class="searchResultContainer"></ul></div>')[0];
    addGameButtonContainer.parentNode.insertBefore(searchResultContainer, addGameButtonContainer);
    document.body.querySelector('input[name="name"]').addEventListener('input', updateSearchResults);
}

async function updateSearchResults() {
    if (updateSearchTimeout()) {
        return;
    }
    lastSearchDate = new Date();
    clearSearchResults();
    const foundGameNames = await search();
    const searchResultElements = createSearchElements(foundGameNames);
    for (const element of searchResultElements) {
        document.querySelector('.searchResultContainer').appendChild(element);
    }
}

function updateSearchTimeout() {
    const now = new Date();
    const milliSecondsSinceLastSearch = now.getTime() - lastSearchDate.getTime();
    if (milliSecondsSinceLastSearch >= minSearchintervalMilliSeconds) {
        return false;
    }
    const delayMilliseconds = minSearchintervalMilliSeconds - milliSecondsSinceLastSearch;
    if (searchTimeout) {
        window.clearTimeout(searchTimeout);
    }
    searchTimeout = window.setTimeout(updateSearchResults, minSearchintervalMilliSeconds, delayMilliseconds);
    return true;
}

function clearSearchResults() {
    document.querySelector('.searchResultContainer').innerHTML = '';
}

async function search() {
    const gameName = getGameName();
    if (gameName.length < 1) {
        return;
    }
    const platform = getPlatform();
    const userName = getUserName();

    const foundGameNames = await getSearchResults(userName, gameName, platform);
    return foundGameNames;
}

function getGameName() {
    const nameInput = document.body.querySelector('input[name="name"]');
    return nameInput.value;
}

function getPlatform() {
    const platformSelectionElement = document.body.querySelector('select[name="console"]');
    const platform = platformSelectionElement.value;
    return platform;
}

function getUserName() {
    const parameters = getHrefParameterString();
    const userName = getParameterFromParameterString(parameters, 'user');
    return userName;
}

function getHrefParameterString() {
    const href = window.location.href;
    const tokens = href.split('?');
    const parameters = tokens[1];
    return parameters;
}

function getParameterFromParameterString(parameterString, parameterName) {
    const parameters = parameterString.split('&');
    const wantedParameter = parameters.find(parameter => parameter.startsWith(parameterName + '='));
    const parameterValue = wantedParameter.substring(wantedParameter.indexOf('=') + 1);
    return parameterValue;
}

async function getSearchResults(userName, gameName, platform) {
    const parameters = convertObjectToGetParameters({
        user: userName,
        search: gameName,
        console: platform,
        ajid: 0 // This is required for some reason.
    });
    const response = await new Promise(resolve =>
        GM.xmlHttpRequest({
            method: 'GET',
            url: `ajax_moregames.php?${parameters}`,
            onload: resolve
        })
    );
    return parseGameNamesFromSearchResponse(response);
}

function convertObjectToGetParameters(object) {
    return Object.entries(object).
        map(pair => encodeURIComponent(pair[0]) + '=' + encodeURIComponent(pair[1]))
        .join('&');
}

function parseGameNamesFromSearchResponse(response) {
    const html = response.responseText;
    const element = document.createElement('div');
    element.innerHTML = html;
    const gameNameElements = element.querySelectorAll('.gamebox:not(.systemend) h2 b');
    const gameNames = [...gameNameElements].map(gameNameElement => gameNameElement.textContent.trim());
    element.remove();
    return gameNames;
}

function createSearchElements(gameNames) {
    if (gameNames.length < 1) {
        const element = document.createElement('li');
        element.textContent = '<No matching games>';
        return [element]
     } else {
        return gameNames.map(gameName => {
            const element = document.createElement('li');
            element.textContent = gameName;
            return element;
        });
    }
}