export async function apiRequest(method, endpoint, data=null, isFileUpload=false) {
	const url = `${endpoint}`;
	const options = {
		method,
		headers: {
			// 'Content-Type': 'application/json',
			...(isFileUpload ? {} : { 'Content-Type': 'application/json' }),
		},
		credentials: "include",  // Need after JWT integration
	};

	if (data) {
		if (isFileUpload) {
			const formData = new FormData();
			formData.append('file', data);
			options.body = formData;
		} else {
			options.body = JSON.stringify(data);
		}
	}
	console.log('Data before API request:', options);

	try {
		const response = await fetch(url, options);
		if (response.ok) {
			return await response.json();
		}
		throw new Error(`Request failed: ${response.status}`);
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
}

// Example usage
// async function getUserData(username) {
//     try {
//         const data = await apiRequest('GET', API_ENDPOINTS.GET_USER_DATA(username));
//         console.log(data);
//     } catch (error) {
//         // Error handling
//     }
// }
