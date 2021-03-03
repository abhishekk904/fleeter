let cropper;
let timer;
var selectedUsers = [];

$(document).ready(() => {
	refreshMessagesBadge();
	refreshNotificationsBadge();
	$.get(
		'/api/posts',
		{
			replyTo: { $exists: false },
			content: { $exists: true },
			postedBy: { $ne: userLoggedIn._id },
		},
		(results) => {
			console.log(results);
			outputPosts(results, $('.trendingPostContainer'));
		}
	);
	$.get(`/api/users/${userLoggedIn._id}/suggestions`, (results) => {
		outputUsers(results, $('.userToFollowConatiner'));
	});
});

$('#postTextarea').on('input', function () {
	$('#postPhotoTextarea').val(this.value);
});

$('#postPhotoTextarea').on('input', function () {
	$('#postTextarea').val(this.value);
});

$('#postTextarea, #replyTextarea').keyup((event) => {
	const textbox = $(event.target);
	const value = textbox.val().trim();
	const isModal = textbox.parents('.modal').length === 1;

	const submitButton = isModal
		? $('#submitReplyButton')
		: $('#submitPostButton');

	if (submitButton.length == 0) return alert('No submit button found');
	if (value == '') {
		submitButton.prop('disabled', true);
		return;
	}
	if (!isModal) $('#postPhotoButton').prop('disabled', false);
	submitButton.prop('disabled', false);
});

$('#postPhotoTextarea').keyup((event) => {
	const textbox = $(event.target);
	const value = textbox.val().trim();
	const submitButton = $('#postPhotoButton');
	if (value == '') {
		submitButton.prop('disabled', true);
		return;
	}
	submitButton.prop('disabled', false);
});

$('#submitPostButton, #submitReplyButton').click((event) => {
	const button = $(event.target);

	const isModal = button.parents('.modal').length === 1;
	const textbox = isModal ? $('#replyTextarea') : $('#postTextarea');

	const data = {
		content: textbox.val(),
	};

	if (isModal) {
		const id = button.data().id;
		if (id === null) return alert('Button Id is null');
		data.replyTo = id;
		console.log(id);
	}
	$.post('/api/posts', data, (postData) => {
		if (postData.replyTo) {
			emitNotification(postData.replyTo.postedBy);
			location.reload();
		} else {
			const html = createPostHtml(postData);
			console.log(html);
			$('.postsContainer').prepend(html);
			textbox.val('');
			button.prop('disabled', true);
		}
	});
});

$('#replyModal').on('show.bs.modal', (event) => {
	const button = $(event.relatedTarget);
	const postId = getPostIdFromElement(button);
	$('#submitReplyButton').data('id', postId);

	$.get('/api/posts/' + postId, (results) => {
		outputPosts(results.postData, $('#originalPostContainer'));
	});
});

$('#replyModal').on('hidden.bs.modal', () => {
	$('#originalPostContainer').html('');
});

$('#deletePostModal').on('show.bs.modal', (event) => {
	const button = $(event.relatedTarget);
	const postId = getPostIdFromElement(button);
	$('#deletePostButton').data('id', postId);
});

$('#pinModal').on('show.bs.modal', (event) => {
	const button = $(event.relatedTarget);
	const postId = getPostIdFromElement(button);
	$('#pinPostButton').data('id', postId);
});

$('#unpinModal').on('show.bs.modal', (event) => {
	const button = $(event.relatedTarget);
	const postId = getPostIdFromElement(button);
	$('#unpinPostButton').data('id', postId);
});

$('#deletePostButton').click((event) => {
	const postId = $(event.target).data('id');
	$.ajax({
		url: `/api/posts/${postId}`,
		type: 'DELETE',
		success: (data, status, xhr) => {
			if (xhr.status !== 202) {
				alert('Could not delete post');
				return;
			}
			location.reload();
		},
	});
});

$('#pinPostButton').click((event) => {
	const postId = $(event.target).data('id');
	$.ajax({
		url: `/api/posts/${postId}`,
		type: 'PUT',
		data: { pinned: true },
		success: (data, status, xhr) => {
			if (xhr.status !== 204) {
				alert('Could not pin post');
				return;
			}
			location.reload();
		},
	});
});

$('#unpinPostButton').click((event) => {
	const postId = $(event.target).data('id');
	$.ajax({
		url: `/api/posts/${postId}`,
		type: 'PUT',
		data: { pinned: false },
		success: (data, status, xhr) => {
			if (xhr.status !== 204) {
				alert('Could not unpin post');
				return;
			}
			location.reload();
		},
	});
});

$('#filePhoto').change((event) => {
	const input = $(event.target)[0];
	if (input.files && input.files[0]) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const image = document.getElementById('imagePreview');
			image.src = e.target.result;

			if (cropper !== undefined) {
				cropper.destroy();
			}
			cropper = new Cropper(image, {
				aspectRatio: 1 / 1,
				background: false,
				zoomOnWheel: false,
			});
		};
		reader.readAsDataURL(input.files[0]);
	}
});

$('#imageUploadButton').click(() => {
	var canvas = cropper.getCroppedCanvas();
	if (canvas == null) {
		return alert('Could not upload image');
	}
	canvas.toBlob((blob) => {
		const formData = new FormData();
		formData.append('croppedImage', blob);

		$.ajax({
			url: '/api/users/profilePicture',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: () => {
				location.reload();
			},
		});
	});
});

$('#coverPhoto').change((event) => {
	const input = $(event.target)[0];
	if (input.files && input.files[0]) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const image = document.getElementById('coverPreview');
			image.src = e.target.result;

			if (cropper !== undefined) {
				cropper.destroy();
			}
			cropper = new Cropper(image, {
				aspectRatio: 16 / 9,
				background: false,
				zoomOnWheel: false,
			});
		};
		reader.readAsDataURL(input.files[0]);
	}
});

$('#coverPhotoButton').click(() => {
	var canvas = cropper.getCroppedCanvas();
	if (canvas == null) {
		return alert('Could not upload image');
	}
	canvas.toBlob((blob) => {
		const formData = new FormData();
		formData.append('croppedImage', blob);

		$.ajax({
			url: '/api/users/coverPhoto',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: () => {
				location.reload();
			},
		});
	});
});

$('#postPhoto').change((event) => {
	const input = $(event.target)[0];
	if (input.files && input.files[0]) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const image = document.getElementById('postPreview');
			image.src = e.target.result;

			if (cropper !== undefined) {
				cropper.destroy();
			}
			cropper = new Cropper(image, {
				aspectRatio: 16 / 9,
				background: false,
				zoomOnWheel: false,
			});
		};
		reader.readAsDataURL(input.files[0]);
	}
});

$('#postPhotoButton').click((event) => {
	const button = $(event.target);
	const textbox = $('#postPhotoTextarea');
	const formData = new FormData();
	formData.append('content', textbox.val());
	if (cropper != null) {
		var canvas = cropper.getCroppedCanvas();
		if (canvas == null) {
			return alert('Select a photo');
		}
		canvas.toBlob((blob) => {
			formData.append('croppedImage', blob);

			$.ajax({
				url: '/api/posts',
				type: 'POST',
				data: formData,
				processData: false,
				contentType: false,
				success: () => {
					location.reload();
				},
			});
		});
	} else {
		$.ajax({
			url: '/api/posts',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: () => {
				location.reload();
			},
		});
	}
});

$('#userSearchTextBox').keydown((event) => {
	clearTimeout(timer);
	const textBox = $(event.target);
	let value = textBox.val();

	if (value == '' && (event.which == 8 || event.keyCode == 8)) {
		selectedUsers.pop();
		updateSelectedUsersHtml();
		$('.resultsContainer').html('');
		if (selectedUsers.length == 0) {
			$('#createChatButton').prop('disabled', true);
		}
		return;
	}

	timer = setTimeout(() => {
		value = textBox.val().trim();
		if (value == '') {
			$('.resultsContainer').html('');
		} else {
			searchUsers(value);
		}
	}, 1000);
});

$('#createChatButton').click(() => {
	const data = JSON.stringify(selectedUsers);

	$.post('/api/chats', { users: data }, (chat) => {
		if (!chat || !chat._id) return alert('Wrong response from server');
		window.location.href = `/messages/${chat._id}`;
	});
});

$(document).on('click', '.likeButton', (event) => {
	const button = $(event.target);
	const postId = getPostIdFromElement(button);
	if (postId === undefined) return;
	$.ajax({
		url: `/api/posts/${postId}/like`,
		type: 'PUT',
		success: (postData) => {
			button.find('span').text(postData.likes.length || '');
			if (postData.likes.includes(userLoggedIn._id)) {
				button.addClass('active');
				emitNotification(postData.postedBy);
			} else {
				button.removeClass('active');
			}
		},
	});
});

$(document).on('click', '.retweetButton', (event) => {
	const button = $(event.target);
	const postId = getPostIdFromElement(button);
	if (postId === undefined) return;
	$.ajax({
		url: `/api/posts/${postId}/retweet`,
		type: 'POST',
		success: (postData) => {
			button.find('span').text(postData.retweetUsers.length || '');
			if (postData.retweetUsers.includes(userLoggedIn._id)) {
				button.addClass('active');
				emitNotification(postData.postedBy);
			} else {
				button.removeClass('active');
			}
		},
	});
});

$(document).on('click', '.post', (event) => {
	const element = $(event.target);
	const postId = getPostIdFromElement(element);

	if (postId !== undefined && !element.is('button')) {
		window.location.href = '/posts/' + postId;
	}
});

$(document).on('click', '.followButton', (event) => {
	const button = $(event.target);
	const userId = button.data().user;
	$.ajax({
		url: `/api/users/${userId}/follow`,
		type: 'PUT',
		success: (data, status, xhr) => {
			if (xhr.status == 404) {
				alert('User not found');
				return;
			}
			let difference = 1;
			if (data.following && data.following.includes(userId)) {
				button.addClass('following');
				button.text('Following');
				emitNotification(userId);
			} else {
				button.removeClass('following');
				button.text('Follow');
				difference = -1;
			}

			const followersLabel = $('#followersValue');
			if (followersLabel.length != 0) {
				let followersText = followersLabel.text();
				followersText = parseInt(followersText);
				followersLabel.text(followersText + difference);
			}
		},
	});
});

$(document).on('click', '.notification.active', (e) => {
	const container = $(e.target);
	const notificationId = container.data().id;

	const href = container.attr('href');
	e.preventDefault();

	const callback = () => (window.location = href);
	markNotificationsAsOpened(notificationId, callback);
});

function getPostIdFromElement(element) {
	const isRoot = element.hasClass('post');
	const rootElement = isRoot ? element : element.closest('.post');
	const postId = rootElement.data().id;
	if (postId === undefined) return alert('Post id undefined');
	return postId;
}

function createPostHtml(postData, boldFont = false) {
	if (postData === null) return alert('Post data null');
	const isRetweet = postData.retweetData !== undefined;
	const retweetedBy = isRetweet ? postData.postedBy.username : null;

	postData = isRetweet ? postData.retweetData : postData;

	const { postedBy, content } = postData;
	if (postedBy._id === undefined) {
		return console.log('User object not populated');
	}
	const displayName = postedBy.firstName + ' ' + postedBy.lastName;
	const timestamp = timeDifference(new Date(), new Date(postData.createdAt));

	const likeButtonActiveClass = postData.likes.includes(userLoggedIn._id)
		? 'active'
		: '';

	const retweetButtonActiveClass = postData.retweetUsers.includes(
		userLoggedIn._id
	)
		? 'active'
		: '';

	const boldFontClass = boldFont ? 'boldFont' : '';

	let retweetText = '';
	if (isRetweet) {
		retweetText = `<span><i class="las la-retweet"></i> Retweeted by <a href='/profile/${retweetedBy}'>${retweetedBy}</a></span>`;
	}

	let replyFlag = '';
	if (postData.replyTo && postData.replyTo._id) {
		if (!postData.replyTo._id) {
			return alert('replyTo is not populated');
		} else if (!postData.replyTo.postedBy._id) {
			return alert('postedBy is not populated');
		}

		let replyToUsername = postData.replyTo.postedBy.username;
		replyFlag = `<div class="replyFlag">
                        Replying to <a href = '/profile/${replyToUsername}'>@${replyToUsername}</a>
                    </div>`;
	}

	let buttons = '';
	let pinnedPostText = '';
	let postImage = '';
	let verifiedBadge = '';
	if (postData.postedBy._id === userLoggedIn._id) {
		let pinnedClass = '';
		let dataTarget = '#pinModal';
		if (postData.pinned === true) {
			pinnedClass = 'active';
			dataTarget = '#unpinModal';
			pinnedPostText =
				'<i class="las la-thumbtack"></i><span> Pinned post</span>';
		}
		buttons = `<button class='pinButton ${pinnedClass}' data-id='$(postData._id)' data-toggle='modal' data-target=${dataTarget}><i class="las la-thumbtack"></i></button>
				<button class='deleteButton data-id='$(postData._id)' data-toggle='modal' data-target='#deletePostModal'><i class="las la-minus-circle"></i></button>`;
	}

	if (postData.postPhoto) {
		postImage = `<img class='postPhoto' src='${postData.postPhoto}' alt='post photo'>`;
	}

	if (postedBy.isVerified) {
		verifiedBadge = `<span class='badge'><i class="fas fa-certificate"></i></span>`;
	}

	return `<div class='post ${boldFontClass}' data-id='${postData._id}'>
                <div class='postActionContainer'>
                    ${retweetText}
                </div>
                <div class='mainContentContainer'>
                    <div class='userImageContainer'>
                        <img src='${postedBy.profilePic}'>
                    </div>
                    <div class='postContentContainer'>
						<div class='pinnedPostText'>${pinnedPostText}</div>
                        <div class='header'>
                            <a href='/profile/${
								postedBy.username
							}' class='displayName'>${displayName}</a>
							${verifiedBadge}
                            <span class='username'>@${postedBy.username}</span>
                            <span class='date'> ${timestamp}</span>
                            ${buttons}

                        </div>
                        ${replyFlag}
                        <div class='postBody'>
                            <span>${content}</span>
                        </div>
						<div class='postPhotoContainer'>
							${postImage}
						</div>
                        <div class='postFooter'>
                            <div class='postButtonContainer'>
                                <button data-toggle='modal' data-target='#replyModal'>
                                    <i class="las la-comments"></i>
                                </button>
                            </div>
                            <div class='postButtonContainer green'>
                                <button class='retweetButton ${retweetButtonActiveClass}'>
                                    <i class="las la-retweet"></i>
                                    <span>${
										postData.retweetUsers.length || ''
									}</span>
                                </button>
                            </div>
                            <div class='postButtonContainer red'>
                                <button class='likeButton ${likeButtonActiveClass}'>
                                    <i class="lar la-heart"></i>
                                    <span>${postData.likes.length || ''}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
}

function timeDifference(current, previous) {
	var msPerMinute = 60 * 1000;
	var msPerHour = msPerMinute * 60;
	var msPerDay = msPerHour * 24;
	var msPerMonth = msPerDay * 30;
	var msPerYear = msPerDay * 365;

	var elapsed = current - previous;

	if (elapsed < msPerMinute) {
		if (elapsed / 1000 < 30) return 'Now';
		return Math.round(elapsed / 1000) + 's';
	} else if (elapsed < msPerHour) {
		return Math.round(elapsed / msPerMinute) + 'm';
	} else if (elapsed < msPerDay) {
		return Math.round(elapsed / msPerHour) + 'h';
	} else if (elapsed < msPerMonth) {
		return Math.round(elapsed / msPerDay) + 'd';
	} else if (elapsed < msPerYear) {
		return Math.round(elapsed / msPerMonth) + 'mo';
	} else {
		return Math.round(elapsed / msPerYear) + 'yr';
	}
}

function outputPosts(results, container) {
	container.html('');

	if (!Array.isArray(results)) {
		results = [results];
	}

	results.forEach((result) => {
		const html = createPostHtml(result);
		container.append(html);
	});

	if (results.length === 0) {
		container.append(`<span class='noPosts'>End of post</span>`);
	}
}

function outputPostsWithReplies(results, container) {
	container.html('');

	if (results.replyTo !== undefined && results.replyTo._id !== undefined) {
		const html = createPostHtml(results.replyTo);
		container.append(html);
	}

	const mainPostHtml = createPostHtml(results.postData, true);
	container.append(mainPostHtml);

	results.replies.forEach((result) => {
		const html = createPostHtml(result);
		container.append(html);
	});
}

function outputUsers(results, container) {
	container.html('');
	results.forEach((result) => {
		const html = createUserHtml(result, true);
		container.append(html);
	});
	if (results.length == 0) {
		container.append('<span class="noResults">No results Found</span>');
	}
}

function createUserHtml(userData, showFollowButton) {
	const name = userData.firstName + ' ' + userData.lastName;
	let followButton = '';
	let isFollowing =
		userLoggedIn.following && userLoggedIn.following.includes(userData._id);

	let text = isFollowing ? 'Following' : 'Follow';
	let buttonClass = isFollowing ? 'followButton following' : 'followButton';

	if (showFollowButton && userLoggedIn._id != userData._id) {
		followButton = `<div class="followButtonContainer">
                            <button class='${buttonClass}' data-user='${userData._id}'>${text}</button>
                        <div>`;
	}
	let verifiedBadge = '';
	if (userData.isVerified) {
		verifiedBadge = `<span class='badge'><i class="fas fa-certificate"></i></span>`;
	}

	return `<div class='user'>
                <div class='userImageContainer'>
                    <img src='${userData.profilePic}'>
                </div>
                <div class='userDetailsContainer'>
                    <div class='header'>
                        <a class='displayName' href='/profile/${userData.username}'>${name}</a>
						${verifiedBadge}
                        <span class='username'>@${userData.username}</span>
                    </div>
                </div>
                ${followButton}
            </div>`;
}

function searchUsers(searchTerm) {
	$.get('/api/users', { search: searchTerm }, (results) => {
		outputSelectableUsers(results, $('.resultsContainer'));
	});
}

function outputSelectableUsers(results, container) {
	container.html('');
	results.forEach((result) => {
		if (
			result._id == userLoggedIn._id ||
			selectedUsers.some((u) => u._id == result._id)
		) {
			return;
		}

		const html = createUserHtml(result, false);
		const element = $(html);
		element.click(() => userSelected(result));
		container.append(element);
	});
	if (results.length == 0) {
		container.append('<span class="noResults">No results Found</span>');
	}
}

function userSelected(user) {
	selectedUsers.push(user);
	updateSelectedUsersHtml();
	$('#userSearchTextBox').val('').focus();
	$('.resultsContainer').html('');
	$('#createChatButton').prop('disabled', false);
}

function updateSelectedUsersHtml() {
	let elements = [];
	selectedUsers.forEach((user) => {
		let name = user.firstName + ' ' + user.lastName;
		let userElement = $(`<span class="selectedUser">${name}</span>`);
		elements.push(userElement);
	});

	$('.selectedUser').remove();
	$('#selectedUsers').prepend(elements);
}

function getChatName(chatData) {
	let chatName = chatData.chatName;
	if (!chatName) {
		let otherChatUsers = getOtherChatUsers(chatData.users);
		let namesArray = otherChatUsers.map(
			(user) => user.firstName + ' ' + user.lastName
		);
		chatName = namesArray.join(', ');
	}
	return chatName;
}

function getOtherChatUsers(users) {
	if (users.length == 1) return users;

	return users.filter((user) => {
		return user._id != userLoggedIn._id;
	});
}

function messageReceived(newMessage) {
	if ($(`[data-room='${newMessage.chat._id}']`).length == 0) {
		showMessagePopup(newMessage);
		refreshMessagesBadge();
	} else {
		addChatMessageHtml(newMessage);
		markMessagesAsRead(newMessage);
	}
}

function markNotificationsAsOpened(notificationId = null, callback = null) {
	if (callback == null) callback = () => location.reload();

	const url =
		notificationId != null
			? `/api/notifications/${notificationId}/markAsOpened`
			: `/api/notifications/markAsOpened`;

	$.ajax({
		url: url,
		type: 'PUT',
		success: () => {
			callback();
		},
	});
}

function refreshMessagesBadge() {
	$.get('/api/chats', { unreadOnly: true }, (data) => {
		const numResults = data.length;

		if (numResults > 0) {
			$('#messagesBadge').text(numResults).addClass('active');
			$('#smallMessagesBadge').text(numResults).addClass('active');
		} else {
			$('#messagesBadge').text('').removeClass('active');
			$('#smallMessagesBadge').text('').removeClass('active');
		}
	});
}

function refreshNotificationsBadge() {
	$.get('/api/notifications', { unreadOnly: true }, (data) => {
		const numResults = data.length;

		if (numResults > 0) {
			$('#notificationsBadge').text(numResults).addClass('active');
			$('#smallNotificationsBadge').text(numResults).addClass('active');
		} else {
			$('#notificationsBadge').text('').removeClass('active');
			$('#smallNotificationsBadge').text('').removeClass('active');
		}
	});
}

function showNotificationPopup(data) {
	const html = createNotificationHtml(data);
	const element = $(html);
	element.hide().prependTo('#notificationList').slideDown('fast');

	setTimeout(() => {
		element.fadeOut(400);
	}, 5000);
}

function showMessagePopup(data) {
	if (!data.chat.latestMessage._id) {
		data.chat.latestMessage = data;
	}
	const html = createChatHtml(data.chat);
	const element = $(html);
	element.hide().prependTo('#notificationList').slideDown('fast');

	setTimeout(() => {
		element.fadeOut(400);
	}, 5000);
}

function outputNotificationList(notifications, container) {
	notifications.forEach((notification) => {
		const html = createNotificationHtml(notification);
		container.append(html);
	});

	if (notifications.length == 0) {
		container.append(`<span class='noResults'>Nothing to show</span>`);
	}
}

function createNotificationHtml(notification) {
	const userFrom = notification.userFrom;
	const text = getNotificationText(notification);
	const href = getNotificationUrl(notification);
	const classNmae = notification.opened ? '' : 'active';

	return `<a href=${href} class='resultListItem notification ${classNmae}' data-id='${notification._id}'>
                <div class='resultsImageContainer'>
                    <img src='${userFrom.profilePic}'>
                </div>
                <div class='resultsDetailsContainer ellipsis'>
                    <span class='ellipsis'>${text}</span>
                </div>
            </a>`;
}

function getNotificationText(notification) {
	const { userFrom } = notification;
	if (!userFrom.firstName || !userFrom.lastName) {
		return alert('User from data not populated');
	}
	const userFromName = `${userFrom.firstName} ${userFrom.lastName}`;

	let text;

	if (notification.notificationType == 'retweet') {
		text = `${userFromName} retweeted one of your posts`;
	} else if (notification.notificationType == 'postLike') {
		text = `${userFromName} liked one of your posts`;
	} else if (notification.notificationType == 'reply') {
		text = `${userFromName} replied one of your posts`;
	} else if (notification.notificationType == 'follow') {
		text = `${userFromName} followed you`;
	}

	return `<span class='ellipsis'>${text}</span>`;
}

function getNotificationUrl(notification) {
	let url = '#';

	if (
		notification.notificationType == 'retweet' ||
		notification.notificationType == 'postLike' ||
		notification.notificationType == 'reply'
	) {
		url = `/posts/${notification.entityId}`;
	} else if (notification.notificationType == 'follow') {
		url = `/profile/${notification.entityId}`;
	}

	return url;
}

function createChatHtml(chatData) {
	const chatName = getChatName(chatData);
	const image = getChatImageElements(chatData);
	const latestMessage = getLatestMessage(chatData.latestMessage);
	const activeClass =
		!chatData.latestMessage ||
		chatData.latestMessage.readBy.includes(userLoggedIn._id)
			? ''
			: 'active';

	return `<a class='resultListItem ${activeClass}' href='/messages/${chatData._id}'>
                ${image}
                <div class='resultsDetailsContainer ellipsis'>
                    <span class='heading ellipsis'>${chatName}</span>
                    <span class='subText ellipsis'>${latestMessage}</span>
                </div>
            </a>`;
}

function getLatestMessage(latestMessage) {
	if (latestMessage != null) {
		const sender = latestMessage.sender;
		return `${sender.firstName} ${sender.lastName}: ${latestMessage.content}`;
	}

	return 'New Chat';
}

function getChatImageElements(chatData) {
	const otherChatUsers = getOtherChatUsers(chatData.users);
	let groupChatClass = '';
	let chatImage = getUserChatImageElement(otherChatUsers[0]);

	if (otherChatUsers.length > 1) {
		groupChatClass = 'groupChatImage';
		chatImage += getUserChatImageElement(otherChatUsers[1]);
	}

	return `<div class='resultsImageContainer ${groupChatClass}'>${chatImage}</div>`;
}

function getUserChatImageElement(user) {
	if (!user || !user.profilePic) {
		return alert('user is invalid');
	}
	return `<img src='${user.profilePic}' alt='User's profile pic'>`;
}

function markAllMessagesAsRead() {
	$.ajax({
		url: `/api/chats/${chatId}/messages/markAsRead`,
		type: 'PUT',
		success: () => refreshMessagesBadge(),
	});
}

function markMessagesAsRead(newMessage) {
	$.ajax({
		url: `/api/chats/${chatId}/messages/${newMessage._id}/markAsRead`,
		type: 'PUT',
		success: () => refreshMessagesBadge(),
	});
}
