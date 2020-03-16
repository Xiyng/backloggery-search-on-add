// ==UserScript==
// @name     Backloggery Search on Add
// @author   Xiyng
// @version  0.3
// @grant    GM.xmlHttpRequest
// @include  https://backloggery.com/newgame.php?user=*
// @run-at   document-idle
// ==/UserScript==

'use strict';

const SEARCH_CONTAINER_CLASS_NAME = 'searchContainer'
const SEARCH_RESULT_CONTAINER_CLASS_NAME = 'searchResultContainer';
const SEARCH_ANIMATION_CLASS_NAME = 'searchAnimation';

const SEARCH_ANIMIATION_BORDER_WIDTH = '0.5em';
const SEARCH_ANIMATION_BACKGROUND_COLOUR = 'lightgrey';
const SEARCH_ANIMATION_MAIN_COLOUR = 'black';
const SEARCH_ANIMATION_CIRCLE_RADIUS = '2em';

const MIN_SEARCH_INTERVAL_MILLISECONDS = 2000;
const FETCH_GAMES_URL = 'ajax_moregames.php';

let searchTimeout = null;
let lastSearchDate = new Date();

initialize();

function initialize() {
    const addGameButton = document.body.querySelector('input[value="Add Game"]');
    const addGameButtonContainer = addGameButton.parentNode;
    const searchContainer = createSearchContainer();
    addGameButtonContainer.parentNode.insertBefore(searchContainer, addGameButtonContainer);
    hideSearchContainer();
    document.body.querySelector('input[name="name"]').addEventListener('input', updateSearchResults);
}

function createSearchContainer() {
    const div = document.createElement('div');
    div.className = SEARCH_CONTAINER_CLASS_NAME;

    const p = document.createElement('p');
    const b = document.createElement('b');
    b.textContent = 'Similar games';
    p.appendChild(b);
    div.appendChild(p);

    const ul = document.createElement('ul');
    ul.className = SEARCH_RESULT_CONTAINER_CLASS_NAME;
    div.appendChild(ul);

    const animationContainer = createSearchAnimationContainer();
    div.appendChild(animationContainer);

    return div;
}

function createSearchAnimationContainer() {
    const div = document.createElement('div');
    div.className = SEARCH_ANIMATION_CLASS_NAME;
    div.style.borderStyle = 'solid';
    div.style.borderWidth = SEARCH_ANIMIATION_BORDER_WIDTH;
    div.style.borderRadius = '50%';
    div.style.borderColor = SEARCH_ANIMATION_BACKGROUND_COLOUR;
    div.style.borderTopColor = SEARCH_ANIMATION_MAIN_COLOUR;
    div.style.width = SEARCH_ANIMATION_CIRCLE_RADIUS;
    div.style.height = SEARCH_ANIMATION_CIRCLE_RADIUS;
    div.style.marginBottom = '1em';
    div.animate([
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(360deg)' }
    ], {
        duration: 1000,
        iterations: Infinity
    });
    return div;
}

async function updateSearchResults() {
    showLoadingAnimation();
    if (getGameName().length > 1 && updateSearchTimeout()) {
        return;
    }
    lastSearchDate = new Date();
    clearSearchResults();
    const foundGameNames = await search();
    hideLoadingAnimation();
    if (foundGameNames) {
        showSearchContainer();
    } else {
        hideSearchContainer();
    }
    const searchResultElements = createSearchElements(foundGameNames);
    for (const element of searchResultElements) {
        document.getElementsByClassName(SEARCH_RESULT_CONTAINER_CLASS_NAME)[0].appendChild(element);
    }
}

function updateSearchTimeout() {
    const now = new Date();
    const milliSecondsSinceLastSearch = now.getTime() - lastSearchDate.getTime();
    if (milliSecondsSinceLastSearch >= MIN_SEARCH_INTERVAL_MILLISECONDS) {
        return false;
    }
    const delayMilliseconds = MIN_SEARCH_INTERVAL_MILLISECONDS - milliSecondsSinceLastSearch;
    if (searchTimeout) {
        window.clearTimeout(searchTimeout);
    }
    searchTimeout = window.setTimeout(updateSearchResults, MIN_SEARCH_INTERVAL_MILLISECONDS, delayMilliseconds);
    return true;
}

function clearSearchResults() {
    document.getElementsByClassName(SEARCH_RESULT_CONTAINER_CLASS_NAME)[0].innerHTML = '';
}

async function search() {
    const gameName = getGameName();
    if (gameName.length < 1) {
        return null;
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
            url: `${FETCH_GAMES_URL}?${parameters}`,
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

function showLoadingAnimation() {
    showSearchContainer();
    document.getElementsByClassName(SEARCH_RESULT_CONTAINER_CLASS_NAME)[0].style.display = 'none';
    document.getElementsByClassName(SEARCH_ANIMATION_CLASS_NAME)[0].style.display = 'block';
}

function hideLoadingAnimation() {
    document.getElementsByClassName(SEARCH_ANIMATION_CLASS_NAME)[0].style.display = 'none';
    document.getElementsByClassName(SEARCH_RESULT_CONTAINER_CLASS_NAME)[0].style.display = 'block';
}

function showSearchContainer() {
    document.getElementsByClassName(SEARCH_CONTAINER_CLASS_NAME)[0].style.display = 'block';
}

function hideSearchContainer() {
    document.getElementsByClassName(SEARCH_CONTAINER_CLASS_NAME)[0].style.display = 'none';
}

function createSearchElements(gameNames) {
    if (gameNames.length < 1) {
        const li = document.createElement('li');
        const i = document.createElement('i');
        i.textContent = '<No similar games>';
        li.appendChild(i);
        return [li]
     } else {
        return gameNames.map(gameName => {
            const element = document.createElement('li');
            element.textContent = gameName;
            return element;
        });
    }
}