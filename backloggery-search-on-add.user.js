// ==UserScript==
// @name     Backloggery Search on Add
// @author   Xiyng
// @version  0.1
// @grant    none
// @include  https://www.backloggery.com/newgame.php?user=*
// @run-at   document-idle
// @require  https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// ==/UserScript==

'use strict';

run();

function run() {
    const addGameButton = document.body.querySelector('input[value="Add Game"]');
    const addGameButtonContainer = addGameButton.parentNode;
    const searchButton = $('<input type="button" value="Search">')[0];
    addGameButtonContainer.prepend(searchButton);
    searchButton.addEventListener('click', search);
}

function search() {
    const gameName = getGameName();
    if (gameName.length < 1) {
        return;
    }
    const uriGameName = encodeURIComponent(gameName);

    const platform = getPlatform();
    const uriPlatform = encodeURIComponent(platform);

    const userName = getUserName();
    window.open(
        `https://www.backloggery.com/games.php?user=${userName}&search=${uriGameName}&console=${uriPlatform}`,
        '_blank'
    );
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