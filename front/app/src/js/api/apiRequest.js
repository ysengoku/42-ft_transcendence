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
		console.error('Response:', response);
		const errorData = await response.json();
		const error = new Error(`Request failed: ${response.status}`);
		error.response = errorData;
		error.status = response.status;
		throw error;
	} catch (error) {
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
