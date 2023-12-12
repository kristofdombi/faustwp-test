export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const [_, encodedCredentials] = req.headers.authorization.split(' ')
      const decodedCredentials = Buffer.from(encodedCredentials, 'base64').toString('utf-8')
      const [username, password] = decodedCredentials.split(':')

      if (username !== process.env.BASIC_AUTH_USERNAME || password !== process.env.BASIC_AUTH_PASSWORD) {
        console.log('Invalid credentials')
        return res.status(401).json({ message: 'Invalid credentials' })
      }

      const permalink = req.body.post_permalink
      const slug = permalink.replace(/http(s)?:\/\/(\w|\.)+/g, '')

      if (!slug) {
        return res.status(500).json({ message: 'Missing slug' })
      }

      await res.revalidate(slug.replace(/\/$/, ''))

      // Purge edge cache
      const url = `https://cf-api.kinsta.services/edge/v1/${process.env.APP_HOSTNAME}/purge`;
      const options = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.KINSTA_API_KEY}`,
        },
      }

      const edgeCacheRes = await fetch(url, options)
      const edgeCacheData = await edgeCacheRes.json()

      if (!edgeCacheData.success) {
        throw new Error('Failed to purge edge cache')
      }

      return res.status(200).send('Revalidated')
    } catch (error) {
      console.error(error)
      return res.status(500).json({ message: 'Something went wrong' })
    }
  }

  return res.status(404).send('Not found')
}