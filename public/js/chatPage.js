let typing = false;
let lastTyingTime;
$(document).ready(() => {
	socket.emit('join room', chatId);
	socket.on('typing', () => {
		$('.typingDots').show();
	});
	socket.on('stop typing', () => {
		$('.typingDots').hide();
	});
	$.get(`/api/chats/${chatId}`, (data) => {
		$('#chatName').text(getChatName(data));
	});

	$.get(`/api/chats/${chatId}/messages`, (data) => {
		let messages = [];
		let lastSenderId = '';

		data.forEach((message, index) => {
			let html = createMessageHtml(
				message,
				data[index + 1],
				lastSenderId
			);
			messages.push(html);
			lastSenderId = message.sender._id;
		});

		var messagesHtml = messages.join('');
		addMessagesHtmlToPage(messagesHtml);
		scrollToBottom(false);
		markAllMessagesAsRead();

		$('.loadingSpinnerContainer').remove();
		$('.chatContainer').css('visibility', 'visible');
	});
});

$('#chatNameButton').click(() => {
	const name = $('#chatNameTextbox').val().trim();
	$.ajax({
		url: '/api/chats/' + chatId,
		type: 'PUT',
		data: { chatName: name },
		success: (data, status, xhr) => {
			if (xhr.status != 204) {
				return alert('Could not update');
			}
			location.reload();
		},
	});
});

$('.sendMessageButton').click(() => {
	messageSubmitted();
});
$('.inputTextbox').keydown((event) => {
	updateTying();

	if (event.which == 13 && !event.shiftKey) {
		messageSubmitted();
		return false;
	}
});

function updateTying() {
	if (!connected) return;

	if (!typing) {
		typing = true;
		socket.emit('typing', chatId);
	}

	lastTyingTime = new Date().getTime();
	const timerLength = 3000;

	setTimeout(() => {
		let timeNow = new Date().getTime();
		let timeDiff = timeNow - lastTyingTime;
		if (timeDiff >= timerLength && typing) {
			socket.emit('stop typing', chatId);
			typing = false;
		}
	}, timerLength);
}

function addMessagesHtmlToPage(html) {
	$('.chatMessages').append(html);
}

function messageSubmitted() {
	const content = $('.inputTextbox').val().trim();
	if (content != '') {
		sendMessage(content);
		$('.inputTextbox').val('');
		socket.emit('stop typing', chatId);
		typing = false;
	}
}

function sendMessage(content) {
	$.post(
		'/api/messages',
		{ content: content, chatId: chatId, readBy: userLoggedIn._id },
		(data, status, xhr) => {
			if (xhr.status != 201) {
				alert('Could not send');
				$('.inputTextbox').val(content);
				return;
			}
			addChatMessageHtml(data);

			if (connected) {
				socket.emit('new message', data);
			}
		}
	);
}

function addChatMessageHtml(message) {
	if (!message || !message._id) {
		return alert('Message is not valid');
	}
	const messageDiv = createMessageHtml(message);
	addMessagesHtmlToPage(messageDiv, null, '');
	scrollToBottom(true);
}

function createMessageHtml(message, nextMessage, lastSenderId) {
	const sender = message.sender;
	const senderName = sender.firstName + ' ' + sender.lastName;

	const currentSenderId = sender._id;
	const nextSenderId = nextMessage != null ? nextMessage.sender._id : '';

	const isFirst = lastSenderId != currentSenderId;
	const isLast = nextSenderId != currentSenderId;

	const isMine = message.sender._id == userLoggedIn._id;
	let liClassName = isMine ? 'mine' : 'theirs';

	let nameElement = '';

	if (isFirst) {
		liClassName += ' first';

		if (!isMine) {
			nameElement = `<span class="senderName">${senderName}</span>`;
		}
	}
	let profileImage = '';
	if (isLast) {
		liClassName += ' last';
		profileImage = `<img src='${sender.profilePic}'>`;
	}
	let imageContainer = '';
	if (!isMine) {
		imageContainer = `<div class="imageContainer">
                                ${profileImage}
                            </div>`;
	}

	return `<li class='message ${liClassName}'>
                ${imageContainer}
                <div class='messageContainer'>
                    ${nameElement}
                    <span class='messageBody'>${message.content}</span>
                </div>
            </li>`;
}

function scrollToBottom(animated) {
	const container = $('.chatMessages');
	const scrollHeight = container[0].scrollHeight;
	if (animated) {
		container.animate({ scrollTop: scrollHeight }, 'slow');
	} else {
		container.scrollTop(scrollHeight);
	}
}
