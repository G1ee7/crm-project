export async function fetchUsers() {
    const data = await fetch('https://jsonplaceholder.typicode.com/users')

    if(!data.ok) {
        throw new Error('error')
    }

    return await data.json()
}