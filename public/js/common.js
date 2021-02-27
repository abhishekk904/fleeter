let cropper;

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

$('#confirmPinModal').on('show.bs.modal', (event) => {
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
	if (postData.postedBy._id === userLoggedIn._id) {
		let pinnedClass = '';
		let dataTarget = '#confirmPinModal';
		if (postData.pinned === true) {
			pinnedClass = 'active';
			dataTarget = '#unpinModal';
			pinnedPostText =
				'<i class="las la-thumbtack"></i><span> Pinned post</span>';
		}
		buttons = `<button class='pinButton ${pinnedClass}' data-id='$(postData._id)' data-toggle='modal' data-target=${dataTarget}><i class="las la-thumbtack"></i></button>
				<button class='deleteButton data-id='$(postData._id)' data-toggle='modal' data-target='#deletePostModal'><i class="las la-minus-circle"></i></button>`;
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
                            <span class='username'>@${postedBy.username}</span>
                            <span class='date'>${timestamp}</span>
                            ${buttons}

                        </div>
                        ${replyFlag}
                        <div class='postBody'>
                            <span>${content}</span>
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
		if (elapsed / 1000 < 30) return 'Just now';
		return Math.round(elapsed / 1000) + ' seconds ago';
	} else if (elapsed < msPerHour) {
		return Math.round(elapsed / msPerMinute) + ' minutes ago';
	} else if (elapsed < msPerDay) {
		return Math.round(elapsed / msPerHour) + ' hours ago';
	} else if (elapsed < msPerMonth) {
		return Math.round(elapsed / msPerDay) + ' days ago';
	} else if (elapsed < msPerYear) {
		return Math.round(elapsed / msPerMonth) + ' months ago';
	} else {
		return Math.round(elapsed / msPerYear) + ' years ago';
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
