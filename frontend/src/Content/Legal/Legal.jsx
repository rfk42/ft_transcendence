import './Legal.scss'

const Legal = () => {
  return (
    <section className="legal-container">
      <div className="legal-card">
        <h1>Legal Notice</h1>

        <h2>Publisher</h2>
        <p><strong>Name :</strong> Rafik Hamini, Noe Lambert, Akim Hamini </p>
        <p><strong>Email :</strong> <a href="mailto:ludo@ludo.gg">ludo@ludo.gg</a></p>

        <h2>Intellectual Property</h2>
        <p>All content on this site (texts, images, logos, etc.) is protected by copyright.</p>
        <p>Any reproduction, representation, modification or adaptation without prior authorization is prohibited.</p>

        <h2>Personal Data</h2>
        <p>Data collected (email, favorite team, etc.) is used solely for the operation of the site.</p>
        <p>In accordance with GDPR, you can request deletion of your data by contacting: <a href="mailto:ludo@ludo.gg">ludo@ludo.gg</a></p>
        <p>No data is shared with third parties.</p>

        <h2>Cookies</h2>
        <p>This site uses technical cookies necessary for its operation, particularly for authentication management. These cookies do not collect data for advertising purposes.</p>

        <h2>Limitation of Liability</h2>
        <p>This site is provided free of charge. The publisher cannot be held responsible for errors or omissions in the content.</p>
      </div>
    </section>
  )
}

export default Legal