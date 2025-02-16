import React from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import './NavHead.css'; 

const NavHead = () => {
    return (
        <div>
            <div className="header">
                <Navbar expand="lg" bg="black" data-bs-theme="dark">
                    <Container fluid>
                        <Link 
                            className="img-class" 
                            to={`/`}
                        >
                            <img 
                                src="TransparentWhiteLogo1.png" 
                                alt="icon" 
                            />
                            Auto Anchor
                        </Link>     
                    </Container>
                </Navbar>
            </div>
        </div>
    );
};

export default NavHead;
