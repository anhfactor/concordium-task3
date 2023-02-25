import { Info } from '@concordium/react-components';
import { Alert, Col, Row } from 'react-bootstrap';

interface Props {
    contract: Info;
}

export function ContractDetails({ contract }: Props) {
    return (
        <Alert variant="secondary">
            <Row>
                <Col sm={3}>Contract Name:</Col>
                <Col sm={9}>
                    <code>{contract.name}</code>
                </Col>
            </Row>
            <Row>
                <Col sm={3}>Index:</Col>
                <Col sm={9}>
                    <code>{contract.index.toString()}</code>
                </Col>
            </Row>
            <Row>
                <Col sm={3}>Owner:</Col>
                <Col sm={9}>
                    <code>{contract.owner.address}</code>
                </Col>
            </Row>
            <Row>
                <Col sm={3}>Total donation:</Col>
                <Col sm={9}>{contract.amount.microCcdAmount.toString()} μCCD</Col>
            </Row>
        </Alert>
    );
}
