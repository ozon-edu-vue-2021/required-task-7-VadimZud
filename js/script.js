let users; // Массив пользователей, возвращенный с сервера
let idUserMap = {}; // Будет мапить id пользователя в объект с данными о пользователе.
// Это даст мне быстрый поиск пользователя по id.
// Не использую массив, т.к. предполагаю, что id могут быть непоследовательными,
// ненепрерывными и при этом очень большими. Не использую Map, т.к. мне не нужны
// все возможности Map (с которыми, скорее всего, связаны дополнительные
// накладные расходы)
let popularUsers; //Три самых популярных пользователя

// Куча предопределенных узлов разметки. Не очень красиво в коде, но
// позволит сильно уменьшить число манипуляций с dom.
let contactList;
let listItemTemplate;
let userName;
let firstFriend;
let secondFriend;
let thirdFriend;
let firstNoFriend;
let secondNoFriend;
let thirdNoFriend;
let firstMostPopular;
let secondMostPopular;
let thirdMostPopular;
let firstFriendItem;
let secondFriendItem;
let thirdFriendItem;
let firstNoFriendItem;
let secondNoFriendItem;
let thirdNoFriendItem;
let firstMostPopularItem;
let secondMostPopularItem;
let thirdMostPopularItem;
let backButton;
let listView;
let detailView;

// В скрипте запускаются два независимых (в логическом смысле, не технически)
// процесса: загрузка/подготовка данных и загрузка dom. 
// Отображать данные на dom можно, когда и то и другое завершилось.
// Оба процесса используют эти флаги для уведомления о своём завершении, и
// тот из них, что завершится последним, запустит процедуру отображения.
let dataPrepared = false;
let domLoaded = false;

let lastScroll;

// В задании требуется выводить списки "самых популярных друзей" или
// списки, отсортированные по имени. Первая мысль, приходящая в голову,
// отсортировать по соответствующему условию и выводить с начала списка.
// Однако по заданию, выводится не более 3-х значений, а значит,
// вместо использования сортировки, со сложностью порядка O(n*log(n))
// или хуже, можно применить модернизированный алгоритм поиска
// максимума/минимума с линейной сложностью.
// arr - массив исходных данных
// compare - функция сравнения, аналогичная sort
// empty - "пустой" объект, которым инициализируется возвращаемый
// массив из 3-элементов.
function threeMost(arr, compare, empty) {
    let first = empty;
    let second = empty;
    let third = empty;

    arr.forEach((item) => {
        if (compare(item, first) < 0) {
            third = second;
            second = first;
            first = item;
        } else if (compare(item, second) < 0) {
            third = second;
            second = item;
        } else if (compare(item, third) < 0) {
            third = item;
        }
    });

    return [first, second, third];
}

// Оптимизация threeMost для поиска "недрузей".
// Во время поиска игнорирует все элементы из ignoreSet.
// Предполагает, что каждый элемент в ignoreSet в искомом
// массиве встречается только один раз, благодаря чему делает
// дополнительные оптимизации (это верно для множества друзей).
// "Портит" ignoreSet, если необходимо, нужно делать его копию.
function threeMostWithIgnoreSet(arr, compare, empty, ignoreSet) {
    let first = empty;
    let second = empty;
    let third = empty;

    arr.forEach((item) => {
        if (ignoreSet.has(item)) {
            // Предполагаем, что такой же item в
            // arr больше не встретится, а значит
            // его можно удалить, чтобы он не нагружал
            // поиск в следующий раз.
            ignoreSet.delete(item);
        } else {
            if (compare(item, first) < 0) {
                third = second;
                second = first;
                first = item;
            } else if (compare(item, second) < 0) {
                third = second;
                second = item;
            } else if (compare(item, third) < 0) {
                third = item;
            }
        }
    });

    return [first, second, third];
}

function compareByName(user1, user2) {
    return user1.name.localeCompare(user2.name);
}

function compareByPopularuty(user1, user2) {
    const popularityDiff = user2.popularity - user1.popularity;
    if (popularityDiff) {
        return popularityDiff;
    }
    return compareByName(user1, user2);
}

function prepareData(data) {
    users = data;
    // Мапим пользователей по id,
    // плюс задаем начальные значения популярности,
    // чтобы избавиться от лишних проверок на следующем шаге
    users.forEach(user => {
        idUserMap[user.id] = user;
        user.popularity = 0;
    });

    // Вычисляем популярность друзей и подменяем все
    // id на ссылки на структуры user, чтобы в дальнейшем
    // не обращаться лишний раз к idUsersMap.
    // Может показаться, что это можно было бы сделать
    // при предыдущем обходе и не плодить новый,
    // однако только к этому моменту мы имеем полностью
    // сформированный idUserMap и можем полноценно им
    // пользоваться. Мы могли бы, конечно, помещать в idUserMap
    // временный элемент, если сам пользователь там еще
    // не появился, но тогда мы получили бы лишние проверки
    // на каждой итерации, расходы на которые бы, скорее всего,
    // полностью бы перекрыли расходы на еще одну
    // инициализацию forEach.
    users.forEach(user => {
        user.friends = user.friends.map((friendId) => {
            const friend = idUserMap[friendId];
            if (friend) {
                friend.popularity++;
            }
            return friend;
        });
    });

    // Определяем самых популярных пользователей.
    // Эта информация активно не изменяется и нужна в каждой карточке,
    // поэтому можно вычислить её сразу и больше не беспокоиться об этом
    popularUsers = threeMost(users, compareByPopularuty, { popularity: -1, empty: true });

    dataPrepared = true;
    if (domLoaded) {
        renderData();
    }
}

// Списки, связанные с пользователем, вычисляются только по запросу,
// но такие результаты имее смысл кешировать, что не вычислять множество
// раз понапрасну.
function getThreeFriends(user) {
    if (user.threeFriends) {
        return user.threeFriends;
    }
    // String.fromCharCode(0xffff) - это символ с наибольшим кодом 
    // (в utf-16, который использует js под капотом).
    // Учитывая, что последний печатаемый символ - это U+FFFD,
    // U+FFFF будет гарантированно больше любой видимой строки.
    user.threeFriends = threeMost(user.friends, compareByName, { name: String.fromCharCode(0xffff), empty: true });
    return user.threeFriends;
}

function getThreeNoFriends(user) {
    if (user.threeNoFriends) {
        return user.threeNoFriends;
    }
    // Здесь можно пойти различными путями. Если пользователь заглядывает
    // почти в каждую карточку пользователя, тогда, возможно, будет
    // эффективнее предварительно отсортировать список пользователей
    // в prepareData, а потом извлекать из него первые три значения,
    // игнорируя множество друзей. Подход, реализованный здесь, может
    // оказаться предпочтительнее, если пользователь просматривает небольшую
    // долю карточек от общего числа пользователей. В любом случае,
    // в реальных проектах будут нужны реальные замеры
    user.threeNoFriends = threeMostWithIgnoreSet(users, compareByName, { name: String.fromCharCode(0xffff), empty: true }, new Set(user.friends));
    return user.threeNoFriends;
}

function renderData() {
    const contactListFragment = document.createDocumentFragment();

    users.forEach(user => {
        const item = listItemTemplate.content.cloneNode(true);
        const listItem = item.querySelector(".list-item");
        const name = listItem.querySelector(".user-name");

        listItem.dataset.user = user.id;
        name.textContent = user.name;

        contactListFragment.append(item);
    });

    contactList.append(contactListFragment);

    // Список самых популярных людей в каждой карточке одинаков, поэтому
    // Выводим его сразу и больше не трогаем.
    firstMostPopularItem.classList.toggle("hidden", Boolean(popularUsers[0].empty));
    if (!popularUsers[0].empty) {
        firstMostPopular.textContent = popularUsers[0].name;
    }
    secondMostPopularItem.classList.toggle("hidden", Boolean(popularUsers[1].empty));
    if (!popularUsers[1].empty) {
        secondMostPopular.textContent = popularUsers[1].name;
    }
    thirdMostPopularItem.classList.toggle("hidden", Boolean(popularUsers[2].empty));
    if (!popularUsers[2].empty) {
        thirdMostPopular.textContent = popularUsers[2].name;
    }
}

function openCard(event) {
    const listItem = event.target.closest(".list-item");

    if (listItem && contactList.contains(listItem)) {
        const user = idUserMap[listItem.dataset.user];
        if (user) {
            const threeFriends = getThreeFriends(user);
            const threeNoFriends = getThreeNoFriends(user);

            userName.textContent = user.name;

            firstFriendItem.classList.toggle("hidden", Boolean(threeFriends[0].empty));
            if (!threeFriends[0].empty) {
                firstFriend.textContent = threeFriends[0].name;
            }
            secondFriendItem.classList.toggle("hidden", Boolean(threeFriends[1].empty));
            if (!threeFriends[1].empty) {
                secondFriend.textContent = threeFriends[1].name;
            }
            thirdFriendItem.classList.toggle("hidden", Boolean(threeFriends[2].empty));
            if (!threeFriends[2].empty) {
                thirdFriend.textContent = threeFriends[2].name;
            }

            firstNoFriendItem.classList.toggle("hidden", Boolean(threeNoFriends[0].empty));
            if (!threeNoFriends[0].empty) {
                firstNoFriend.textContent = threeNoFriends[0].name;
            }
            secondNoFriendItem.classList.toggle("hidden", Boolean(threeNoFriends[1].empty));
            if (!threeNoFriends[1].empty) {
                secondNoFriend.textContent = threeNoFriends[1].name;
            }
            thirdNoFriendItem.classList.toggle("hidden", Boolean(threeNoFriends[2].empty));
            if (!threeNoFriends[2].empty) {
                thirdNoFriend.textContent = threeNoFriends[2].name;
            }

            lastScroll = window.pageYOffset;
            window.scrollTo(0, 0);

            listView.classList.toggle("hidden");
            detailView.classList.toggle("hidden");
        }
    }
}

function closeCard() {
    window.scrollTo(0, lastScroll);
    listView.classList.toggle("hidden");
    detailView.classList.toggle("hidden");
}

fetch("data.json")
    .then(response => response.json())
    .then(data => prepareData(data));

document.addEventListener("DOMContentLoaded", () => {
    contactList = document.querySelector(".contacts-list");
    listItemTemplate = contactList.querySelector("#list-item-template");
    userName = document.querySelector(".header .user-name");
    firstFriendItem = document.querySelector("#first-friend-item");
    secondFriendItem = document.querySelector("#second-friend-item");
    thirdFriendItem = document.querySelector("#third-friend-item");
    firstNoFriendItem = document.querySelector("#first-no-friend-item");
    secondNoFriendItem = document.querySelector("#second-no-friend-item");
    thirdNoFriendItem = document.querySelector("#third-no-friend-item");
    firstMostPopularItem = document.querySelector("#first-most-popular-item");
    secondMostPopularItem = document.querySelector("#second-most-popular-item");
    thirdMostPopularItem = document.querySelector("#third-most-popular-item");
    firstFriend = firstFriendItem.querySelector(".user-name");
    secondFriend = secondFriendItem.querySelector(".user-name");
    thirdFriend = thirdFriendItem.querySelector(".user-name");
    firstNoFriend = firstNoFriendItem.querySelector(".user-name");
    secondNoFriend = secondNoFriendItem.querySelector(".user-name");
    thirdNoFriend = thirdNoFriendItem.querySelector(".user-name");
    firstMostPopular = firstMostPopularItem.querySelector(".user-name");
    secondMostPopular = secondMostPopularItem.querySelector(".user-name");
    thirdMostPopular = thirdMostPopularItem.querySelector(".user-name");
    backButton = document.querySelector(".back");
    listView = document.querySelector(".list-view");
    detailView = document.querySelector(".details-view");

    contactList.addEventListener("click", openCard);
    backButton.addEventListener("click", closeCard);

    domLoaded = true;
    if (dataPrepared) {
        renderData();
    }
})