package Web::Components::Context;

use Web::ComposableRequest::Constants
                      qw( FALSE NUL TRUE );
use Unexpected::Types qw( Bool HashRef Str );
use List::Util        qw( pairs );
use Type::Utils       qw( class_type );
use Moo;

=pod

=encoding utf-8

=head1 Name

Web::Components::Context - Context base class

=head1 Synopsis

   use Moo;

   extends 'Web::Components::Context';

=head1 Description

Context base class

=head1 Configuration and Environment

Defines the following attributes;

=over 3

=item action

Action path of the current request. Immutable string

=item has_action

Predicate

=cut

has 'action' => is => 'rw', isa => Str, predicate => 'has_action';

=item body_parameters

Returns a hash reference of the posted body parameters

=cut

has 'body_parameters' =>
   is      => 'lazy',
   isa     => HashRef,
   default => sub { shift->request->body_parameters };

=item button_pressed

Returns the string value of the button that was pressed to submit the form

=cut

has 'button_pressed' =>
   is      => 'lazy',
   isa     => Str,
   default => sub { shift->body_parameters->{_submit} // FALSE };

=item controllers

A hash reference of controller component objects

=cut

has 'controllers' => is => 'ro', isa => HashRef, default => sub { {} };

=item models

A hash reference of model component objects

=cut

has 'models' => is => 'ro', isa => HashRef, default => sub { {} };

=item posted

A boolean which is true if the request is a post

=cut

has 'posted' =>
   is      => 'lazy',
   isa     => Bool,
   default => sub { lc shift->request->method eq 'post' ? TRUE : FALSE };

=item request

A weakened reference to the request object

=cut

has 'request' =>
   is       => 'ro',
   isa      => class_type('Web::ComposableRequest::Base'),
   required => TRUE,
   weak_ref => TRUE;

=item session

A weakened reference to the session object

=cut

has 'session' =>
   is       => 'lazy',
   weak_ref => TRUE,
   default  => sub { shift->request->session };

=item views

A hash reference of view component objects

=cut

has 'views'  => is => 'ro', isa => HashRef, default => sub { {} };

has '_stash' => is => 'lazy', isa => HashRef, default => sub { {} };

=back

=head1 Subroutines/Methods

Defines the following methods;

=over 3

=item clear_redirect

Clears the redirect key from the stash

=cut

sub clear_redirect {
   return delete shift->stash->{redirect};
}

=item endpoint

Last method in the chain of methods called in response to this request

=cut

sub endpoint {
   return (split m{ / }mx, (shift->stash('method_chain') // NUL))[-1];
}

=item method_chain

Returns the supplied action path. Should be overridden in the subclass

=cut

sub method_chain {
   my ($self, $action) = @_; return $action;
}

=item stash

Accessor/mutator for the stash

=cut

sub stash {
   my ($self, @args) = @_;

   return $self->_stash unless $args[0];

   return $self->_stash->{$args[0]} unless $args[1];

   for my $pair (pairs @args) {
      $self->_stash->{$pair->key} = $pair->value;
   }

   return $self->_stash;
}

=item verify_form_post

Should be implemented in the subclass

=cut

sub verify_form_post {
   return 'Not implemented';
}

=item view

Returns the object references of the supplied view moniker

=cut

sub view {
   my ($self, $view) = @_; return $self->views->{$view};
}

use namespace::autoclean;

1;

__END__

=back

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<Class::Usul::Cmd>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <pjfl@cpan.org> >>

=head1 License and Copyright

Copyright (c) 2026 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
